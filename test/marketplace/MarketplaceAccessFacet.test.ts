import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { MarketplaceAccessFacet } from "../../typechain";
import { one, impersonateContract } from "../utils";
import { marketplaceFixtureFunc } from "../fixtures/marketplace";
import { toUnpaddedHexString } from "../../src/utils";
import {
  Fast,
  Issuer,
  Marketplace,
} from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
import { IForwarder } from "../../typechain";
chai.use(solidity);
chai.use(smock.matchers);

// TODO: Test that automatons with MARKETPLACE_PRIVILEGE_MANAGE_MEMBERS can add / remove members.
// TODO: Test that automatons without MARKETPLACE_PRIVILEGE_MANAGE_MEMBERS cannot add / remove members.
describe("MarketplaceAccessFacet", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    rob: SignerWithAddress,
    john: SignerWithAddress;

  let issuer: FakeContract<Issuer>,
    fast: FakeContract<Fast>,
    marketplace: Marketplace,
    forwarder: FakeContract<IForwarder>,
    access: MarketplaceAccessFacet,
    issuerMemberAccess: MarketplaceAccessFacet;

  const marketplaceDeployFixture = deployments.createFixture(
    marketplaceFixtureFunc
  );

  const resetIssuerMock = () => {
    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);
  };

  const resetFastMock = () => {
    issuer.isFastRegistered.reset();
    issuer.isFastRegistered.whenCalledWith(fast.address).returns(true);
    issuer.isFastRegistered.returns(false);
  };

  const resetIForwarderMock = () => {
    forwarder.supportsInterface.reset();
    forwarder.supportsInterface.whenCalledWith(/* IForwarder */ "0x25e23e64").returns(true);
    forwarder.supportsInterface.returns(false);
  }

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, alice, bob, rob, john] = await ethers.getSigners();
    // Mock Issuer, Fast and IForwarder contracts.
    issuer = await smock.fake("Issuer");
    fast = await smock.fake("Fast");
    forwarder = await smock.fake("IForwarder");
  });

  beforeEach(async () => {
    await marketplaceDeployFixture({
      opts: {
        name: "MarketplaceAccessFixture",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ marketplace } = args);
          access = await ethers.getContractAt<MarketplaceAccessFacet>(
            "MarketplaceAccessFacet",
            marketplace.address
          );
          issuerMemberAccess = access.connect(issuerMember);
        },
      },
      initWith: {
        issuer: issuer.address,
      },
    });

    resetIssuerMock();
    resetFastMock();
    resetIForwarderMock();
  });

  describe("AHasContext implementation", () => {
    describe("_isTrustedForwarder", () => {
      it("returns true if the address is a trusted forwarder", async () => {
        // Set the trusted forwarder.
        forwarder.supportsInterface.reset();
        forwarder.supportsInterface.whenCalledWith(/* IForwarder */ "0x25e23e64").returns(true);
        forwarder.supportsInterface.returns(false);

        await marketplace.connect(issuerMember).setTrustedForwarder(forwarder.address);

        // isTrustedForwarder() should delegate to _isTrustedForwarder().
        const subject = await marketplace.connect(issuerMember).isTrustedForwarder(forwarder.address);
        expect(subject).to.eq(true);
      });
    });

    describe("_msgSender", () => {
      it("returns the original msg.sender");
    });
  });

  describe("IHasMembers", () => {
    describe("isMember", () => {
      beforeEach(async () => {
        await issuerMemberAccess.addMember(alice.address);
      });

      it("returns true when the address is a member", async () => {
        const subject = await marketplace.isMember(alice.address);
        expect(subject).to.eq(true);
      });

      it("returns false when the address is not a member", async () => {
        const subject = await marketplace.isMember(bob.address);
        expect(subject).to.eq(false);
      });
    });

    describe("memberCount", () => {
      beforeEach(async () => {
        await issuerMemberAccess.addMember(alice.address);
      });

      it("returns the current count of members", async () => {
        const subject = await marketplace.memberCount();
        expect(subject).to.eq(1);
      });
    });

    describe("paginateMembers", () => {
      beforeEach(async () => {
        // Add 4 members.
        await issuerMemberAccess.addMember(alice.address);
        await issuerMemberAccess.addMember(bob.address);
        await issuerMemberAccess.addMember(rob.address);
        await issuerMemberAccess.addMember(john.address);
      });

      it("returns the cursor to the next page", async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [, cursor] = await marketplace.paginateMembers(0, 3);
        expect(cursor).to.eq(3);
      });

      it("does not crash when overflowing and returns the correct cursor", async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [, cursor] = await marketplace.paginateMembers(1, 10);
        expect(cursor).to.eq(4);
      });

      it("returns the governors in the order they were added", async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [values] = await marketplace.paginateMembers(0, 5);
        expect(values).to.be.ordered.members([
          alice.address,
          bob.address,
          rob.address,
          john.address,
        ]);
      });
    });

    describe("addMember", () => {
      it("requires Issuer membership (anonymous)", async () => {
        const subject = access.addMember(alice.address);
        await expect(subject).to.have.revertedWith(`RequiresMembersManager`);
      });

      it("delegates to the Issuer for permission", async () => {
        await issuerMemberAccess.addMember(alice.address);
        expect(issuer.isMember).to.be.calledOnceWith(issuerMember.address);
      });

      it("requires that the address is not a member yet", async () => {
        await issuerMemberAccess.addMember(alice.address);
        const subject = issuerMemberAccess.addMember(alice.address);
        await expect(subject).to.have.revertedWith("Address already in set");
      });

      it("adds the given address as a member", async () => {
        await issuerMemberAccess.addMember(alice.address);
        const subject = await marketplace.isMember(alice.address);
        expect(subject).to.eq(true);
      });

      it("emits a MemberAdded event", async () => {
        const subject = issuerMemberAccess.addMember(alice.address);
        await expect(subject)
          .to.emit(access, "MemberAdded")
          .withArgs(alice.address);
      });

      it("calls back onMemberAdded");

      it("is callable by a trusted forwarder", async () => {
        // Set the trusted forwarder.
        await marketplace.connect(issuerMember).setTrustedForwarder(forwarder.address);

        // Impersonate the trusted forwarder contract.
        const accessAsForwarder = await impersonateContract(access, forwarder.address);

        // Build the data to call addMember() on the Marketplace contract.
        // Pack the issuerMember address at the end - this is sponsored callers address.
        const encodedFunctionCall = await access.interface.encodeFunctionData("addMember", [alice.address]);
        const data = ethers.utils.solidityPack(
          ["bytes", "address"],
          [encodedFunctionCall, issuerMember.address]
        );

        // As the forwarder send the packed transaction.
        await accessAsForwarder.signer.sendTransaction(
          {
            data: data,
            to: access.address,
          }
        );

        // Check that Alice is a member.
        const subject = await marketplace.isMember(alice.address);
        expect(subject).to.eq(true);
      });
    });

    describe("removeMember", () => {
      beforeEach(async () => {
        // We want alice to be a member for these tests.
        await issuerMemberAccess.addMember(alice.address);
        resetIssuerMock();
      });

      it("requires Issuer membership (anonymous)", async () => {
        const subject = marketplace.removeMember(alice.address);
        await expect(subject).to.have.revertedWith(`RequiresMembersManager`);
      });

      it("delegates to the Issuer for permission", async () => {
        await issuerMemberAccess.removeMember(alice.address);
        expect(issuer.isMember).to.be.calledOnceWith(issuerMember.address);
      });

      it("requires that the address is an existing member - calls LibAddressSet", async () => {
        const subject = issuerMemberAccess.removeMember(bob.address);
        await expect(subject).to.have.revertedWith(
          "Address does not exist in set"
        );
      });

      it("requires that the given member has no FAST memberships", async () => {
        await ethers.provider.send("hardhat_setBalance", [
          fast.address,
          toUnpaddedHexString(one),
        ]);
        await marketplace
          .connect(await ethers.getSigner(fast.address))
          .memberAddedToFast(alice.address);

        const subject = issuerMemberAccess.removeMember(alice.address);
        await expect(subject).to.have.revertedWith(`RequiresNoFastMemberships`);
      });

      it("removes the given address as a member", async () => {
        await issuerMemberAccess.removeMember(alice.address);
        const subject = await marketplace.isMember(alice.address);
        expect(subject).to.eq(false);
      });

      it("emits a MemberRemoved event", async () => {
        const subject = issuerMemberAccess.removeMember(alice.address);
        await expect(subject)
          .to.emit(access, "MemberRemoved")
          .withArgs(alice.address);
      });

      it("calls back onMemberRemoved");

      it("is callable by a trusted forwarder", async () => {
        // Set the trusted forwarder.
        await marketplace.connect(issuerMember).setTrustedForwarder(forwarder.address);

        // Impersonate the trusted forwarder contract.
        const accessAsForwarder = await impersonateContract(access, forwarder.address);

        // Build the data to call removeMember() on the Marketplace contract.
        // Pack the issuerMember address at the end - this is sponsored callers address.
        const encodedFunctionCall = await access.interface.encodeFunctionData("removeMember", [alice.address]);
        const data = ethers.utils.solidityPack(
          ["bytes", "address"],
          [encodedFunctionCall, issuerMember.address]
        );

        // As the forwarder send the packed transaction.
        await accessAsForwarder.signer.sendTransaction(
          {
            data: data,
            to: access.address,
          }
        );

        // Check that Alice is not member.
        const subject = await marketplace.isMember(alice.address);
        expect(subject).to.eq(false);
      });
    });

    describe("onMemberAdded", () => {
      it("MUST BE TESTED");
    });

    describe("onMemberRemoved", () => {
      it("MUST BE TESTED");
    });
  });

  describe("fastMemberships", () => {
    beforeEach(async () => {
      // This FAST is registered.
      issuer.isFastRegistered.reset();
      issuer.isFastRegistered.whenCalledWith(fast.address).returns(true);

      // Add calling FAST to the list of FASTs a member belongs to.
      const marketplaceAsFast = await impersonateContract(
        marketplace,
        fast.address
      );
      await marketplaceAsFast.memberAddedToFast(alice.address);
    });

    it("returns an array of FASTs a given user belongs to along with a cursor", async () => {
      // Check which FASTs Alice belongs to, expect membership of 1 FAST.
      const [[memberFast], nextCursor] = await marketplace.fastMemberships(
        alice.address,
        0,
        10
      );
      expect(memberFast).to.be.eq(fast.address);
      expect(nextCursor).to.be.eq(1);
    });

    it("does not return FASTs the given user does not belong to", async () => {
      // Check fast memberships for Bob, expect there to be none.
      const [fastMemberships, nextCursor] = await marketplace.fastMemberships(
        bob.address,
        0,
        10
      );
      expect(fastMemberships).to.be.empty;
      expect(nextCursor).to.be.eq(0);
    });
  });

  describe("memberAddedToFast", () => {
    it("requires the caller to be a registered FAST", async () => {
      const subject = marketplace.memberAddedToFast(alice.address);
      await expect(subject).to.have.been.revertedWith(
        "RequiresFastContractCaller"
      );
    });

    it("adds the given member to the FAST membership tracking data structure", async () => {
      // This FAST is registered.
      issuer.isFastRegistered.reset();
      issuer.isFastRegistered.whenCalledWith(fast.address).returns(true);

      // Call memberAddedToFast on the Marketplace contract, as the FAST contract.
      const marketplaceAsFast = await impersonateContract(
        marketplace,
        fast.address
      );
      await marketplaceAsFast.memberAddedToFast(alice.address);

      // Expecting the FAST address to be included in FASTs Alice belongs to.
      const [[member]] = await marketplace.fastMemberships(
        alice.address,
        0,
        10
      );
      expect(member).to.be.eq(fast.address);
    });
  });

  describe("memberRemovedFromFast", () => {
    it("requires the caller to be a registered FAST", async () => {
      const subject = marketplace.memberRemovedFromFast(alice.address);
      await expect(subject).to.have.been.revertedWith(
        "RequiresFastContractCaller"
      );
    });

    it("removes the FAST contract from the list of Fast members", async () => {
      // This FAST is registered.
      issuer.isFastRegistered.reset();
      issuer.isFastRegistered.whenCalledWith(fast.address).returns(true);

      const marketplaceAsFast = await impersonateContract(
        marketplace,
        fast.address
      );

      // Add, then remove Alice.
      await marketplaceAsFast.memberAddedToFast(alice.address);
      await marketplaceAsFast.memberRemovedFromFast(alice.address);

      // Expecting the FAST address to no longer be included in FASTs Alice belongs to.
      const [fastMemberships /* nextCursor */] =
        await marketplace.fastMemberships(alice.address, 0, 10);
      expect(fastMemberships).to.be.empty;
    });
  });

  describe("isActiveMember", () => {
    it("returns true when a member is active", async () => {
      // Add Bob as a marketplace active member.
      await issuerMemberAccess.addMember(bob.address);
      const subject = await access.isActiveMember(bob.address);
      expect(subject).to.eq(true);
    });

    it("returns false when a member is deactived", async () => {
      // Add Alice as a deactivated marketplace member.
      await issuerMemberAccess.addMember(alice.address);
      await issuerMemberAccess.deactivateMember(alice.address);
      const subject = await access.isActiveMember(alice.address);
      expect(subject).to.eq(false);
    });
  });

  describe("deactivateMember", () => {
    beforeEach(async () => {
      // Add Alice as an Marketplace member.
      await issuerMemberAccess.addMember(alice.address);
    });

    it("requires the caller to be an Issuer member", async () => {
      const subject = access.deactivateMember(alice.address);
      await expect(subject).to.have.revertedWith(`RequiresIssuerMembership`);
    });

    it("requires the member to deactivate is an Marketplace member", async () => {
      const subject = issuerMemberAccess.deactivateMember(bob.address);
      await expect(subject).to.have.revertedWith(
        `RequiresMarketplaceMembership`
      );
    });

    it("adds the FAST member to the list of deactivated members", async () => {
      await issuerMemberAccess.deactivateMember(alice.address);
      const subject = await access.isActiveMember(alice.address);
      expect(subject).to.eq(false);
    });

    it("emits a MemberDeactivated event", async () => {
      const subject = issuerMemberAccess.deactivateMember(alice.address);
      expect(subject)
        .to.emit(access, "MemberDeactivated")
        .withArgs(alice.address);
    });

    it("requires that a given member is not already deactivated", async () => {
      // Deactivate Alice.
      await issuerMemberAccess.deactivateMember(alice.address);

      // Attempt to re-deactivate Alice.
      const subject = issuerMemberAccess.deactivateMember(alice.address);
      await expect(subject).to.have.revertedWith(
        `RequiresMarketplaceActiveMembership`
      );
    });
  });

  describe("activateMember", () => {
    beforeEach(async () => {
      // Add Alice as an Marketplace member.
      await issuerMemberAccess.addMember(alice.address);
      // Deactivate Alice.
      await issuerMemberAccess.deactivateMember(alice.address);
    });

    it("requires the caller to be an Issuer member", async () => {
      const subject = access.activateMember(alice.address);
      await expect(subject).to.have.revertedWith(`RequiresIssuerMembership`);
    });

    it("requires the member to activate is an Marketplace member", async () => {
      const subject = issuerMemberAccess.activateMember(bob.address);
      await expect(subject).to.have.revertedWith(
        `RequiresMarketplaceMembership`
      );
    });

    it("removes the FAST member from the list of deactivated members", async () => {
      await issuerMemberAccess.activateMember(alice.address);
      const subject = await access.isActiveMember(alice.address);
      expect(subject).to.eq(true);
    });

    it("emits a MemberActivated event", async () => {
      const subject = issuerMemberAccess.activateMember(alice.address);
      expect(subject)
        .to.emit(access, "MemberActivated")
        .withArgs(alice.address);
    });

    it("requires that a given member is currently deactivated", async () => {
      // Add Bob as an Marketplace member.
      await issuerMemberAccess.addMember(bob.address);
      // Attempt to activate an already active member.
      const subject = issuerMemberAccess.activateMember(bob.address);
      await expect(subject).to.have.revertedWith(
        `RequiresMarketplaceDeactivatedMember`
      );
    });
  });
});
