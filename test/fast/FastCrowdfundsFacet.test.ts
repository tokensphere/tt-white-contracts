import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import {
  FastAccessFacet,
  FastCrowdfundsFacet,
  IERC20,
  Crowdfund,
  FastFrontendFacet,
  IForwarder,
  Fast
} from "../../typechain";
import { fastFixtureFunc } from "../fixtures/fast";
import {
  Issuer,
  Marketplace,
} from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
import { ZERO_ADDRESS } from "../../src/utils";
import { abiStructToObj, impersonateContract } from "../utils";
chai.use(solidity);
chai.use(smock.matchers);

describe("FastCrowdfundsFacet", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    rob: SignerWithAddress,
    john: SignerWithAddress;
  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    erc20: FakeContract<IERC20>,
    frontendMock: FakeContract<FastFrontendFacet>,
    forwarder: FakeContract<IForwarder>,
    fast: Fast,
    crowdfunds: FastCrowdfundsFacet,
    crowdfundsAsMember: FastCrowdfundsFacet,
    crowdfundsAsGovernor: FastCrowdfundsFacet,
    crowdfundsAsIssuer: FastCrowdfundsFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  const resetIForwarderMock = () => {
    forwarder.supportsInterface.reset();
    forwarder.supportsInterface.whenCalledWith(/* IForwarder */ "0x25e23e64").returns(true);
    forwarder.supportsInterface.returns(false);
  }

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, alice, bob, rob, john] =
      await ethers.getSigners();
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");
    erc20 = await smock.fake("IERC20");
    forwarder = await smock.fake("IForwarder");
    marketplace.issuerAddress.returns(issuer.address);
  });

  beforeEach(async () => {
    // Issuer is a member of the issuer contract.
    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);
    // Issuer member is an almighty automaton.
    issuer.automatonCan.reset();
    issuer.automatonCan.returns(true);

    marketplace.isMember.reset();
    [governor, alice, bob, rob, john].forEach(({ address }) => {
      marketplace.isMember.whenCalledWith(address).returns(true);
      marketplace.isActiveMember.whenCalledWith(address).returns(true);
    });
    marketplace.isMember.returns(false);
    marketplace.isActiveMember.returns(false);

    erc20.balanceOf.reset();
    erc20.balanceOf.returns(100);
    erc20.allowance.reset();
    erc20.allowance.returns(100);
    erc20.transferFrom.reset();
    erc20.transferFrom.returns(true);

    await ethers.provider.send("hardhat_setBalance", [
      alice.address,
      "0xffffffffffffffffffff",
    ]);

    await fastDeployFixture({
      opts: {
        name: "FastCrowdfundsFixture",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ fast } = args);
          ({ frontendMock } = args);
          crowdfunds = await ethers.getContractAt<FastCrowdfundsFacet>(
            "FastCrowdfundsFacet",
            fast.address
          );
          await fast.connect(issuerMember).addGovernor(governor.address);
          crowdfundsAsMember = crowdfunds.connect(alice);
          crowdfundsAsGovernor = crowdfunds.connect(governor);
          crowdfundsAsIssuer = crowdfunds.connect(issuerMember);
          const access = await ethers.getContractAt<FastAccessFacet>(
            "FastAccessFacet",
            fast.address
          );
          await access.connect(governor).addMember(alice.address);
        },
      },
      initWith: {
        issuer: issuer.address,
        marketplace: marketplace.address,
      },
    });

    resetIForwarderMock();
  });

  describe("AHasContext implementation", () => {
    describe("_isTrustedForwarder", () => {
      it("returns true if the address is a trusted forwarder", async () => {
        await fast.connect(issuerMember).setTrustedForwarder(forwarder.address);

        // isTrustedForwarder() should delegate to _isTrustedForwarder().
        const subject = await fast.connect(issuerMember).isTrustedForwarder(forwarder.address);
        expect(subject).to.eq(true);
      });
    });

    describe("_msgSender", () => {
      it("returns the original msg.sender");
    });
  });

  describe("crowdfundsDefaultBasisPointFee", () => {
    it("returns the default basis point fee", async () => {
      const subject = await crowdfunds.crowdfundsDefaultBasisPointFee();
      expect(subject).to.eq(15_00);
    });
  });

  describe("setCrowdfundsDefaultBasisPointFee", () => {
    it("requires the caller to be an Issuer Member", async () => {
      issuer.isMember.reset();
      issuer.isMember.returns(false);
      const subject = crowdfunds.setCrowdfundsDefaultBasisPointFee(1_00);
      await expect(subject).to.have.revertedWith("RequiresIssuerMembership");
    });

    it("reverts if the fee is greater than 100%", async () => {
      const subject =
        crowdfundsAsIssuer.setCrowdfundsDefaultBasisPointFee(10_001);
      await expect(subject).to.have.revertedWith(
        "InvalidCrowdfundBasisPointsFee"
      );
    });

    it("sets the new crowdfunds default basis points fee", async () => {
      await crowdfundsAsIssuer.setCrowdfundsDefaultBasisPointFee(1_00);
      const subject = await crowdfunds.crowdfundsDefaultBasisPointFee();
      expect(subject).to.eq(1_00);
    });

    it("delegates to the Frontend facet for event emission", async () => {
      frontendMock.emitDetailsChanged.reset();
      await crowdfundsAsIssuer.setCrowdfundsDefaultBasisPointFee(1_00);
      expect(frontendMock.emitDetailsChanged)
        .to.have.been.calledOnceWith()
        .delegatedFrom(crowdfunds.address);
    });
  });

  describe("createCrowdfund", () => {
    it("requires the caller to be a FAST governor", async () => {
      issuer.automatonCan.reset();
      issuer.automatonCan.returns(false);
      const subject = crowdfunds.createCrowdfund(
        erc20.address,
        alice.address,
        "Blah"
      );
      await expect(subject).to.have.revertedWith("RequiresFastGovernorship");
    });

    it("deploys a new crowdfund with the given parameters", async () => {
      await crowdfundsAsGovernor.createCrowdfund(
        erc20.address,
        alice.address,
        "Blah"
      );
      const [page] = await crowdfundsAsGovernor.paginateCrowdfunds(0, 1);
      expect(page.length).to.eq(1);
    });

    it("is callable by a trusted forwarder", async () => {
      // Set the trusted forwarder.
      await fast.connect(issuerMember).setTrustedForwarder(forwarder.address);

      // Impersonate the trusted forwarder contract.
      const crowdfundsAsForwarder = await impersonateContract(crowdfunds, forwarder.address);

      // Build the data to call the sponsored function.
      // Pack the original msg.sender address at the end - this is sponsored callers address.
      const encodedFunctionCall = await crowdfunds.interface.encodeFunctionData("createCrowdfund", [erc20.address, alice.address, "Sponsored call reference"]);
      const data = ethers.utils.solidityPack(
        ["bytes", "address"],
        [encodedFunctionCall, governor.address]
      );

      // As the forwarder send the packed transaction.
      await crowdfundsAsForwarder.signer.sendTransaction(
        {
          data: data,
          to: crowdfunds.address,
        }
      );

      // Inspect the owner of the crowdfund.
      const [page] = await crowdfunds.paginateCrowdfunds(0, 1);
      const crowdfund = await ethers.getContractAt<Crowdfund>("Crowdfund", page[0]);
      const subject = abiStructToObj(await crowdfund.paramsStruct());
      expect(subject.owner).to.eq(governor.address);
    });

    describe("deploys a crowdfund and", () => {
      let tx: any, crowdfundAddr: string, crowdfund: Crowdfund;

      beforeEach(async () => {
        await (tx = crowdfundsAsGovernor.createCrowdfund(
          erc20.address,
          alice.address,
          "Blah"
        ));
        const [crowdfundings] = await crowdfunds.paginateCrowdfunds(0, 1);
        crowdfundAddr = crowdfundings[0];
        crowdfund = await ethers.getContractAt<Crowdfund>(
          "Crowdfund",
          crowdfundAddr
        );
      });

      it("keeps track of the deployed crowdfund", async () => {
        await Promise.all(
          [1, 2].map(() =>
            crowdfundsAsGovernor.createCrowdfund(
              erc20.address,
              alice.address,
              "Blah"
            )
          )
        );
        const [page] = await crowdfunds.paginateCrowdfunds(0, 10);
        expect(page.length).to.eq(3);
      });

      it("sets the fee to the FAST-level default one");

      it("emits a CrowdfundDeployed event", async () => {
        await expect(tx)
          .to.emit(crowdfunds, "CrowdfundDeployed")
          .withArgs(crowdfundAddr);
      });
    });
  });

  describe("removeCrowdfund", () => {
    it("requires the caller to be an issuer member", async () => {
      const subject = crowdfunds.removeCrowdfund(ZERO_ADDRESS);
      await expect(subject).to.have.revertedWith("RequiresIssuerMembership");
    });

    it("reverts when the crowdfund does not exist", async () => {
      const subject = crowdfundsAsIssuer.removeCrowdfund(ZERO_ADDRESS);
      await expect(subject).to.have.revertedWith(
        "Address does not exist in set"
      );
    });

    describe("when successful", async () => {
      beforeEach(async () => {
        await crowdfundsAsGovernor.createCrowdfund(
          erc20.address,
          alice.address,
          "Blah"
        );
      });

      it("removes the crowdfund from the list of deployed crowdfunds", async () => {
        const [before] = await crowdfunds.paginateCrowdfunds(0, 100);
        await crowdfundsAsIssuer.removeCrowdfund(before[0]);
        const [after] = await crowdfunds.paginateCrowdfunds(0, 100);
        expect(after.length).to.eq(0);
      });

      it("emits a CrowdfundRemoved event", async () => {
        const [before] = await crowdfunds.paginateCrowdfunds(0, 100);
        const subject = crowdfundsAsIssuer.removeCrowdfund(before[0]);
        await expect(subject)
          .to.emit(crowdfunds, "CrowdfundRemoved")
          .withArgs(before[0]);
      });
    });
  });

  describe("crowdfundCount", () => {
    beforeEach(async () => {
      await crowdfundsAsGovernor.createCrowdfund(
        erc20.address,
        alice.address,
        "Blah"
      );
    });

    it("counts all deployed crowdfunds", async () => {
      const subject = await crowdfunds.crowdfundCount();
      expect(subject).to.eq(1);
    });
  });

  describe("paginateCrowdfunds", () => {
    beforeEach(async () => {
      await crowdfundsAsGovernor.createCrowdfund(
        erc20.address,
        alice.address,
        "Blah"
      );
    });

    it("returns pages of deployed crowdfunds", async () => {
      const [page] = await crowdfunds.paginateCrowdfunds(0, 10);
      expect(page.length).to.eq(1);
    });
  });
});
