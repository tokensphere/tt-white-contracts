import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { BigNumber } from "ethers";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { ethers } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { Crowdfund, Crowdfund__factory, IERC20 } from "../../typechain";
import { abiStructToObj, CrowdFundPhase } from "../utils";
import {
  Fast,
  Issuer,
  Marketplace,
} from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
chai.use(solidity);
chai.use(smock.matchers);

describe("Crowdfunds", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    paul: SignerWithAddress,
    ben: SignerWithAddress;

  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    fast: FakeContract<Fast>,
    erc20: FakeContract<IERC20>,
    crowdfund: Crowdfund,
    crowdfundAsIssuer: Crowdfund,
    validParams: Crowdfund.ParamsStruct,
    deployCrowdfund: (params: Crowdfund.ParamsStruct) => void;

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, alice, bob, paul, ben] =
      await ethers.getSigners();
  });

  // Before each test, we want to allow impersonating the FAST contract address and fund it.
  beforeEach(async () => {
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");
    fast = await smock.fake("Fast");
    erc20 = await smock.fake("IERC20");

    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);

    marketplace.issuerAddress.reset();
    marketplace.issuerAddress.returns(issuer.address);
    marketplace.isMember.reset();
    // Governor, Alice, Bob and Paul are all Marketplace members.
    marketplace.isMember.whenCalledWith(governor.address).returns(true);
    marketplace.isMember.whenCalledWith(alice.address).returns(true);
    marketplace.isMember.whenCalledWith(bob.address).returns(true);
    marketplace.isMember.whenCalledWith(paul.address).returns(true);
    // Anyone else isn't a Marketplace member.
    marketplace.isMember.returns(false);
    marketplace.isActiveMember.reset();
    marketplace.isActiveMember.whenCalledWith(governor.address).returns(true);
    marketplace.isActiveMember.returns(false);

    fast.issuerAddress.reset();
    fast.issuerAddress.returns(issuer.address);
    fast.marketplaceAddress.reset();
    fast.marketplaceAddress.returns(marketplace.address);
    fast.isMember.reset();
    // Alice is both a FAST governor and a FAST member.
    fast.isGovernor.whenCalledWith(alice.address).returns(true);
    fast.isMember.whenCalledWith(alice.address).returns(true);
    // Bob and Paul are FAST members.
    fast.isMember.whenCalledWith(bob.address).returns(true);
    fast.isMember.whenCalledWith(paul.address).returns(true);

    erc20.balanceOf.reset();
    erc20.transfer.reset();
    erc20.transferFrom.reset();

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [fast.address],
    });
    await ethers.provider.send("hardhat_setBalance", [
      fast.address,
      "0xfffffffffffffffffff",
    ]);

    validParams = {
      owner: alice.address,
      beneficiary: bob.address,
      basisPointsFee: 20_00,
      issuer: issuer.address,
      fast: fast.address,
      token: erc20.address,
      ref: "Some reference",
    };

    deployCrowdfund = async (params) => {
      // Deploy the Crowdfund contract.
      const factory = await ethers.getContractFactory<Crowdfund__factory>(
        "Crowdfund"
      );
      crowdfund = await factory
        .connect(await ethers.getSigner(fast.address))
        .deploy({ ...params, fast: fast.address });
      crowdfundAsIssuer = crowdfund.connect(issuerMember);
    };
  });

  describe("various synthesized getters", async () => {
    beforeEach(async () => {
      await deployCrowdfund(validParams);
    });

    it("expose VERSION", async () => {
      expect(await crowdfund.VERSION()).to.be.eq(2);
    });

    it("expose initial params", async () => {
      const originalParams = await crowdfund.paramsStruct();
      const params = abiStructToObj(originalParams);

      expect(params).to.eql({
        owner: validParams.owner,
        beneficiary: validParams.beneficiary,
        basisPointsFee: validParams.basisPointsFee,
        issuer: validParams.issuer,
        fast: validParams.fast,
        token: validParams.token,
        ref: validParams.ref,
      });
    });

    it("expose phase", async () => {
      const subject = await crowdfund.phase();
      expect(subject).to.eq(CrowdFundPhase.Setup);
    });

    it("expose collected", async () => {
      const subject = await crowdfund.collected();
      expect(subject).to.eq(0);
    });

    it("expose creationBlock", async () => {
      const latestBlockNumber = (await ethers.provider.getBlock("latest"))
        .number;
      const subject = await crowdfund.creationBlock();
      expect(subject).to.be.eq(latestBlockNumber);
    });
  });

  describe("constructor", async () => {
    describe("with the correct params passed", async () => {
      beforeEach(async () => {
        await deployCrowdfund(validParams);
      });

      it("stores its initial parameters", async () => {
        const originalParams = await crowdfund.paramsStruct();
        const params = abiStructToObj(originalParams);

        expect(params).to.eql({
          owner: validParams.owner,
          beneficiary: validParams.beneficiary,
          basisPointsFee: validParams.basisPointsFee,
          issuer: validParams.issuer,
          fast: validParams.fast,
          token: validParams.token,
          ref: validParams.ref,
        });
      });

      it("stores the creation block", async () => {
        const latestBlockNumber = (await ethers.provider.getBlock("latest"))
          .number;
        const subject = await crowdfund.creationBlock();
        expect(subject).to.be.eq(latestBlockNumber);
      });
    });

    describe("with invalid parameters", async () => {
      it("requires the owner to be a governor of the FAST contract", async () => {
        const subject = deployCrowdfund({ ...validParams, owner: ben.address });
        await expect(subject).to.have.revertedWith("RequiresFastGovernorship");
      });

      it("requires the beneficiary to be a member of the FAST contract", async () => {
        const subject = deployCrowdfund({
          ...validParams,
          beneficiary: ben.address,
        });
        await expect(subject).to.have.revertedWith("RequiresFastMembership");
      });
    });
  });

  describe("feeAmount", async () => {
    beforeEach(async () => {
      await deployCrowdfund(validParams);
      // Provision ERC20 token for bob and alice.
      for (const user of [alice, bob]) {
        erc20.allowance.returns(1_000_000_000);
        erc20.transferFrom.returns(true);
      }
    });

    it("covers 100%", async () => {
      // Set the fee to 100%.
      await crowdfundAsIssuer.advanceToFunding(100_00);
      // Pledge 1000 tokens from bob and alice.
      await Promise.all(
        [alice, bob].map((user) => crowdfund.connect(user).pledge(500))
      );
      const subject = await crowdfund.feeAmount();
      // The result should be 100% of 1000: 1000.
      expect(subject).to.eq(1_000);
    });

    it("covers 33%", async () => {
      // Set the fee to 33%.
      await crowdfundAsIssuer.advanceToFunding(3_333);
      // Pledge 1000 tokens from bob and alice.
      await Promise.all(
        [alice, bob].map((user) => crowdfund.connect(user).pledge(500))
      );
      const subject = await crowdfund.feeAmount();
      // The result should be 33% of 1000 rounded up: 334.
      expect(subject).to.eq(334);
    });

    it("covers 0.01%", async () => {
      // Set the fee to 0.01%.
      await crowdfundAsIssuer.advanceToFunding(1);
      // Pledge 1000 tokens from bob and alice.
      await Promise.all(
        [alice, bob].map((user) => crowdfund.connect(user).pledge(500))
      );
      const subject = await crowdfund.feeAmount();
      // The result should be 0.01% of 1000 rounded up: 1.
      expect(subject).to.eq(1);
    });
  });

  describe("advanceToFunding", async () => {
    describe("from an invalid phase", async () => {
      it("reverts", async () => {
        await deployCrowdfund(validParams);
        await crowdfundAsIssuer.terminate(false);
        const subject = crowdfundAsIssuer.advanceToFunding(20_00);
        await expect(subject).to.have.revertedWith("InvalidPhase");
      });
    });

    describe("from the Setup phase", async () => {
      beforeEach(async () => {
        await deployCrowdfund(validParams);
      });

      it("requires the caller to be an issuer member", async () => {
        const subject = crowdfund.connect(alice).advanceToFunding(20_00);
        await expect(subject).to.have.revertedWith(
          "RequiresIssuerMemberCaller"
        );
      });

      it("requires that the fee basis points is set bellow 100%", async () => {
        const subject = crowdfundAsIssuer.advanceToFunding(10_001);
        await expect(subject).to.have.revertedWith("InconsistentParameter");
      });

      it("moves to the Funding phase", async () => {
        await crowdfundAsIssuer.advanceToFunding(20_00);
        const subject = await crowdfund.phase();
        expect(subject).to.eq(CrowdFundPhase.Funding);
      });

      it("emits an Advance event", async () => {
        const subject = crowdfundAsIssuer.advanceToFunding(20_00);
        await expect(subject)
          .to.emit(crowdfund, "Advance")
          .withArgs(CrowdFundPhase.Funding);
      });

      describe("with an overridden fee", async () => {
        it("sets the fee", async () => {
          await crowdfundAsIssuer.advanceToFunding(1_00);
          const subject = await crowdfund.paramsStruct();
          expect(subject.basisPointsFee).to.eq(1_00);
        });

        it("reverts if the override is invalid");
      });
    });
  });

  describe("pledge", async () => {
    describe("from an invalid phase", async () => {
      beforeEach(async () => {
        await deployCrowdfund(validParams);
      });

      it("reverts", async () => {
        const subject = crowdfund.pledge(100_000);
        await expect(subject).to.have.revertedWith("InvalidPhase");
      });
    });

    describe("from the Funding phase", async () => {
      beforeEach(async () => {
        await deployCrowdfund(validParams);
        await crowdfundAsIssuer.advanceToFunding(20_00);
      });

      it("requires the caller to be a member of the FAST contract", async () => {
        const subject = crowdfund.connect(ben).pledge(100_000);
        await expect(subject).to.have.revertedWith("RequiresFastMemberCaller");
      });

      it("requires the amount to not be zero", async () => {
        const subject = crowdfund.connect(alice).pledge(0);
        await expect(subject).to.have.revertedWith("InconsistentParameter");
      });

      it("checks the allowance of the crowdfunding contract with the ERC20 contract", async () => {
        erc20.allowance.returns(100_000);
        erc20.transferFrom.returns(true);
        await crowdfund.connect(bob).pledge(500);
        expect(erc20.allowance).to.have.been.calledWith(
          bob.address,
          crowdfund.address
        );
      });

      it("delegates to the ERC20 token to transfer the funds to the crowdfunding contract", async () => {
        erc20.allowance.returns(10_000);
        erc20.transferFrom.returns(true);
        await crowdfund.connect(alice).pledge(200);
        expect(erc20.transferFrom).to.have.been.calledWith(
          alice.address,
          crowdfund.address,
          200
        );
      });

      it("reverts if the ERC20 transfer fails", async () => {
        erc20.allowance.returns(100_000);
        erc20.transferFrom
          .whenCalledWith(alice.address, crowdfund.address, 500)
          .returns(false);
        const subject = crowdfund.connect(alice).pledge(500);
        await expect(subject).to.have.been.revertedWith("TokenContractError");
      });

      it("reverts if the ERC20 allowance is insufficient", async () => {
        erc20.allowance.returns(100_000);
        const subject = crowdfund.connect(alice).pledge(100_001);
        await expect(subject).to.have.revertedWith("InsufficientFunds");
      });

      describe("with pledgers", async () => {
        beforeEach(async () => {
          erc20.allowance.returns(100_000);
          erc20.transferFrom.returns(true);
          await Promise.all(
            [alice, bob, paul].map((user) =>
              crowdfund.connect(user).pledge(123)
            )
          );
        });

        it("keeps track of the pledger count", async () => {
          const subject = await crowdfund.pledgerCount();
          expect(subject).to.eq(3);
        });

        it("keeps track of the pledgers", async () => {
          const [subject] = await crowdfund.paginatePledgers(0, 5);
          expect(subject).to.have.deep.members([
            alice.address,
            bob.address,
            paul.address,
          ]);
        });

        it("keeps track of the amount pledged", async () => {
          const subject = await crowdfund.pledges(alice.address);
          expect(subject).to.eq(123);
        });

        it("accumulates the total amount pledged", async () => {
          const subject = await crowdfund.collected();
          expect(subject).to.eq(3 * 123);
        });
      });

      it("emits a Pledge event", async () => {
        erc20.allowance.returns(100_000);
        erc20.transferFrom.returns(true);
        const subject = crowdfund.connect(alice).pledge(500);
        await expect(subject)
          .to.emit(crowdfund, "Pledge")
          .withArgs(alice.address, 500);
      });
    });
  });

  describe("terminate", async () => {
    beforeEach(async () => {
      await deployCrowdfund(validParams);
      await crowdfundAsIssuer.advanceToFunding(20_00);
      // Have a few pledges made
      erc20.allowance.returns(100_000);
      erc20.transferFrom.returns(true);
      await Promise.all(
        [alice, bob, paul].map((user) => crowdfund.connect(user).pledge(50))
      );
    });

    describe("upon success", async () => {
      it("requires the caller to be an issuer member", async () => {
        const subject = crowdfund.terminate(true);
        await expect(subject).to.have.revertedWith(
          "RequiresIssuerMemberCaller"
        );
      });

      it("calculates and transfers the fee to the issuer contract", async () => {
        erc20.transfer.reset();
        erc20.transfer.returns(true);
        await crowdfundAsIssuer.terminate(true);
        // The fee should be 25% of 150, which is 30.
        expect(erc20.transfer).to.have.been.calledWith(
          issuer.address,
          BigNumber.from(30)
        );
      });

      it("does not transfer ERC20 if the final fee is 0", async () => {
        erc20.transfer.reset();
        erc20.transfer.returns(true);
        await deployCrowdfund({ ...validParams, basisPointsFee: 0 });
        await crowdfundAsIssuer.terminate(true);
        expect(erc20.transfer).to.not.have.been.called;
      });

      it("reverts if the ERC20 fee transfer fails", async () => {
        erc20.transfer.whenCalledWith(issuer.address, 30).returns(false);
        const subject = crowdfundAsIssuer.terminate(true);
        await expect(subject).to.have.revertedWith("TokenContractError");
      });

      it("does not transfer ERC20 if the payout is 0", async () => {
        erc20.allowance.returns(10_000);
        erc20.transfer.reset();
        erc20.transfer.whenCalledWith(issuer.address, 50).returns(true);
        await deployCrowdfund(validParams);
        await crowdfundAsIssuer.advanceToFunding(20_00);
        await crowdfundAsIssuer.terminate(true);
        expect(erc20.transfer).to.not.have.been.calledWith(
          validParams.beneficiary,
          0
        );
      });

      it("reverts if the beneficiary is not a FAST member", async () => {
        erc20.transfer.returns(true);
        // Mark the beneficiary as a non-FAST member.
        fast.isMember.whenCalledWith(validParams.beneficiary).returns(false);

        const subject = crowdfundAsIssuer.terminate(true);
        await expect(subject).to.have.been.revertedWith(
          "RequiresFastMembership"
        );
      });

      it("transfers the rest of the funds to the beneficiary", async () => {
        erc20.transfer.reset();
        erc20.transfer.returns(true);
        await crowdfundAsIssuer.terminate(true);
        // The rest of the funds should be 120.
        expect(erc20.transfer).to.have.been.calledWith(
          validParams.beneficiary,
          BigNumber.from(120)
        );
      });

      it("reverts if the ERC20 beneficiary transfer fails", async () => {
        erc20.transfer
          .whenCalledWith(validParams.beneficiary, 120)
          .returns(false);
        const subject = crowdfundAsIssuer.terminate(true);
        await expect(subject).to.have.revertedWith("TokenContractError");
      });

      it("advances to the success phase", async () => {
        erc20.transfer.returns(true);
        await crowdfundAsIssuer.terminate(true);
        const subject = await crowdfund.phase();
        expect(subject).to.eq(CrowdFundPhase.Success);
      });
    });

    describe("upon failure", async () => {
      it("requires the caller to be a issuer member", async () => {
        const subject = crowdfund.terminate(false);
        await expect(subject).to.have.revertedWith(
          "RequiresIssuerMemberCaller"
        );
      });

      it("advances to the Failure phase", async () => {
        await crowdfundAsIssuer.terminate(false);
        const subject = await crowdfund.phase();
        expect(subject).to.eq(CrowdFundPhase.Failure);
      });
    });
  });

  describe("refund", async () => {
    describe("from the Setup phase", async () => {
      it("reverts", async () => {
        await deployCrowdfund(validParams);

        const subject = crowdfund.refund(bob.address);
        await expect(subject).to.have.revertedWith("InvalidPhase");

        expect(await crowdfund.phase()).to.be.eq(CrowdFundPhase.Setup);
      });
    });

    describe("from the Funding phase", async () => {
      it("reverts", async () => {
        await deployCrowdfund(validParams);
        await crowdfundAsIssuer.advanceToFunding(20_00);

        const subject = crowdfund.refund(bob.address);
        await expect(subject).to.have.revertedWith("InvalidPhase");

        expect(await crowdfund.phase()).to.be.eq(CrowdFundPhase.Funding);
      });
    });

    describe("from the Success phase", async () => {
      it("reverts", async () => {
        await deployCrowdfund(validParams);
        await crowdfundAsIssuer.terminate(true);

        const subject = crowdfund.refund(bob.address);
        await expect(subject).to.have.revertedWith("InvalidPhase");

        expect(await crowdfund.phase()).to.be.eq(CrowdFundPhase.Success);
      });
    });

    describe("from the Failure phase", async () => {
      beforeEach(async () => {
        await deployCrowdfund(validParams);
        await crowdfundAsIssuer.advanceToFunding(20_00);
        // Have a few pledges made
        erc20.allowance.returns(100_000);
        erc20.transfer.returns(true);
        erc20.transferFrom.returns(true);
        await Promise.all(
          [alice, bob, paul].map((user) => crowdfund.connect(user).pledge(50))
        );
        await crowdfundAsIssuer.terminate(false);
      });

      it("requires the beneficiary to be in the list of pledgers", async () => {
        const subject = crowdfund.refund(ben.address);
        await expect(subject).to.have.revertedWith("UnknownPledger");
      });

      it("requires that the refund hasn't already been made", async () => {
        await crowdfund.refund(bob.address);
        const subject = crowdfund.refund(bob.address);
        await expect(subject).to.have.revertedWith("DuplicateEntry");
      });

      it("marks the refund as done", async () => {
        await crowdfund.refund(bob.address);
        const subject = await crowdfund.refunded(bob.address);
        expect(subject).to.be.true;
      });

      it("uses the ERC20 token to transfer the funds back to the pledger", async () => {
        erc20.transfer.reset();
        erc20.transfer.returns(true);
        await crowdfund.refund(bob.address);
        expect(erc20.transfer).to.have.been.calledWith(bob.address, 50);
      });

      it("reverts if the ERC20 transfer fails", async () => {
        erc20.transfer.returns(false);
        const subject = crowdfund.refund(bob.address);
        await expect(subject).to.have.revertedWith("TokenContractError");
      });
    });
  });

  describe("paramsStruct", async () => {
    it("is already tested in the constructor tests", async () => {});
  });

  describe("details", async () => {
    it("MUST BE TESTED");
  });
});
