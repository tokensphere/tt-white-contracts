import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { BigNumber } from "ethers";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { ethers } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import {
  Issuer,
  Marketplace,
  Distribution,
  Distribution__factory,
  IERC20,
  Fast,
} from "../../typechain";
import { abiStructToObj, DistributionPhase } from "../utils";
import { FastAutomatonPrivilege } from "../../src/utils";
chai.use(solidity);
chai.use(smock.matchers);

describe("Distribution", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress,
    automaton: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    paul: SignerWithAddress,
    ben: SignerWithAddress;

  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    fast: FakeContract<Fast>,
    erc20: FakeContract<IERC20>,
    distribution: Distribution,
    distributionAsIssuer: Distribution,
    distributionAsAutomaton: Distribution,
    validParams: Distribution.ParamsStruct,
    deployDistribution: (params: Distribution.ParamsStruct) => void;

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, automaton, alice, bob, paul, ben] =
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
    marketplace.isMember.whenCalledWith(governor.address).returns(true);
    marketplace.isMember.returns(false);
    marketplace.isActiveMember.reset();
    marketplace.isActiveMember.whenCalledWith(governor.address).returns(true);
    marketplace.isActiveMember.returns(false);

    fast.issuerAddress.reset();
    fast.issuerAddress.returns(issuer.address);
    fast.marketplaceAddress.reset();
    fast.marketplaceAddress.returns(marketplace.address);
    fast.isMember.reset();
    fast.isMember.whenCalledWith(alice.address).returns(true);
    fast.isMember.whenCalledWith(bob.address).returns(true);
    fast.isMember.whenCalledWith(paul.address).returns(true);
    fast.automatonCan.reset();

    erc20.balanceOf.reset();
    erc20.transfer.reset();

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [fast.address],
    });
    await ethers.provider.send("hardhat_setBalance", [
      fast.address,
      "0xfffffffffffffffffff",
    ]);

    validParams = {
      distributor: governor.address,
      issuer: issuer.address,
      fast: fast.address,
      token: erc20.address,
      total: BigNumber.from(100),
      blockLatch: BigNumber.from(0),
      ref: "Some reference",
    };

    deployDistribution = async (params) => {
      // Deploy the Distribution contract.
      const factory = await ethers.getContractFactory<Distribution__factory>(
        "Distribution"
      );
      distribution = await factory
        .connect(await ethers.getSigner(fast.address))
        .deploy({ ...params, fast: fast.address });
      distributionAsIssuer = distribution.connect(issuerMember);
      distributionAsAutomaton = distribution.connect(automaton);
    };
  });

  describe("various synthesized getters", async () => {
    beforeEach(async () => {
      await deployDistribution(validParams);
    });

    it("expose VERSION", async () => {
      expect(await distribution.VERSION()).to.be.eq(3);
    });

    it("expose initial params", async () => {
      const originalParams = await distribution.params();
      const params = abiStructToObj(originalParams);

      expect(params).to.eql({
        distributor: governor.address,
        issuer: issuer.address,
        fast: fast.address,
        token: erc20.address,
        total: BigNumber.from(validParams.total),
        blockLatch: BigNumber.from(validParams.blockLatch),
        ref: validParams.ref,
      });
    });

    it("expose phase", async () => {
      const subject = await distribution.phase();
      expect(subject).to.be.eq(DistributionPhase.Funding);
    });

    it("expose creationBlock", async () => {
      const latestBlockNumber = (await ethers.provider.getBlock("latest"))
        .number;
      const subject = await distribution.creationBlock();
      expect(subject).to.be.eq(latestBlockNumber);
    });

    it("expose fee", async () => {
      const subject = await distribution.fee();
      expect(subject).to.be.eq(0);
    });

    it("expose available", async () => {
      const subject = await distribution.available();
      expect(subject).to.be.eq(validParams.total);
    });
  });

  describe("constructor", async () => {
    describe("with the correct params passed", async () => {
      beforeEach(async () => {
        await deployDistribution(validParams);
      });

      it("stores its initial parameters", async () => {
        const subject = abiStructToObj(await distribution.params());

        expect(subject).to.eql({
          distributor: governor.address,
          issuer: issuer.address,
          fast: fast.address,
          token: erc20.address,
          total: validParams.total,
          blockLatch: validParams.blockLatch,
          ref: validParams.ref,
        });
      });

      it("initializes the `available` funds using the initial `total`", async () => {
        const subject = await distribution.available();
        expect(subject).to.eq(validParams.total);
      });

      it("stores the creation block", async () => {
        const latestBlockNumber = (await ethers.provider.getBlock("latest"))
          .number;
        const subject = await distribution.creationBlock();
        expect(subject).to.eq(BigNumber.from(latestBlockNumber));
      });

      it("leaves the distribution in the Funding phase", async () => {
        const subject = await distribution.phase();
        expect(subject).to.eq(DistributionPhase.Funding);
      });
    });

    describe("with invalid parameters", async () => {
      it("reverts if the latched block is in the future", async () => {
        const latestBlockNumber = (await ethers.provider.getBlock("latest"))
          .number;
        const subject = deployDistribution({
          ...validParams,
          blockLatch: latestBlockNumber + 10,
        });
        await expect(subject).to.have.been.revertedWith(
          "InconsistentParameter"
        );
      });
    });
  });

  describe("advanceToFeeSetup", async () => {
    beforeEach(async () => {
      await deployDistribution(validParams);
      erc20.balanceOf
        .whenCalledWith(distribution.address)
        .returns(validParams.total);
    });

    describe("from an invalid phase", async () => {
      beforeEach(async () => {
        // Mock balance.
        erc20.balanceOf.returns(validParams.total);
        // Advance to correct phase.
        await distribution.advanceToFeeSetup();
      });

      it("reverts", async () => {
        const subject = distribution.advanceToFeeSetup();
        await expect(subject).to.have.revertedWith("InvalidPhase");
      });
    });

    describe("from the Funding phase", async () => {
      it("requires the caller to be the FAST contract", async () => {
        const subject = distribution.connect(bob).advanceToFeeSetup();
        await expect(subject).to.have.revertedWith("RequiresFastCaller");
      });

      it("delegates to the ERC20 contract to retrieve the distribution token balance", async () => {
        await distribution.advanceToFeeSetup();
        expect(erc20.balanceOf).to.have.been.calledOnceWith(
          distribution.address
        );
      });

      it("checks that the token balance is equal to the total (minus)", async () => {
        // Make the ERC20 balance too low.
        erc20.balanceOf
          .whenCalledWith(distribution.address)
          .returns(BigNumber.from(validParams.total).sub(1));
        const subject = distribution.advanceToFeeSetup();
        await expect(subject).to.have.revertedWith("InconsistentParameter");
      });

      it("checks that the token balance is equal to the total (plus)", async () => {
        // Make the ERC20 balance too low.
        erc20.balanceOf
          .whenCalledWith(distribution.address)
          .returns(BigNumber.from(validParams.total).add(1));
        const subject = distribution.advanceToFeeSetup();
        await expect(subject).to.have.revertedWith("InconsistentParameter");
      });

      it("emits advancing to the FeeSetup phase", async () => {
        const subject = await distribution.advanceToFeeSetup();
        expect(subject)
          .to.emit(distribution, "Advance")
          .withArgs(DistributionPhase.FeeSetup);
      });
    });
  });

  describe("advanceToBeneficiariesSetup", async () => {
    beforeEach(async () => {
      beforeEach(async () => {
        // Deploy.
        await deployDistribution(validParams);
        // Mock balance.
        erc20.balanceOf.returns(validParams.total);
      });

      describe("from an invalid phase", async () => {
        it("reverts", async () => {
          const subject = distribution.advanceToBeneficiariesSetup(
            validParams.total
          );
          await expect(subject).to.have.revertedWith("InvalidPhase");
        });
      });

      describe("from the FeeSetup phase", async () => {
        // Advance to correct phase.
        await distribution.advanceToFeeSetup();
      });

      it("requires the caller to be a manager", async () => {
        const subject = distribution.advanceToBeneficiariesSetup(
          validParams.total
        );
        await expect(subject).to.have.revertedWith("RequiresManagerCaller");
      });

      it("is allowed by an automaton with the right privileges", async () => {
        fast.automatonCan
          .whenCalledWith(
            automaton.address,
            FastAutomatonPrivilege.ManageDistributions
          )
          .returns(true);
        await distributionAsAutomaton.advanceToBeneficiariesSetup(
          validParams.total
        );
        const subject = await distribution.phase();
        expect(subject).to.eq(DistributionPhase.BeneficiariesSetup);
      });

      it("requires the right privileges for an automaton", async () => {
        fast.automatonCan
          .whenCalledWith(
            automaton.address,
            FastAutomatonPrivilege.ManageDistributions
          )
          .returns(false);
        const subject = distributionAsAutomaton.advanceToBeneficiariesSetup(
          validParams.total
        );
        await expect(subject).to.have.revertedWith("RequiresManagerCaller");
      });

      it("sets the fee", async () => {
        await distributionAsIssuer.advanceToBeneficiariesSetup(10);
        const subject = await distribution.fee();
        expect(subject).to.eq(10);
      });

      it("underflow if the fee is too large", async () => {
        const subject = distributionAsIssuer.advanceToBeneficiariesSetup(
          BigNumber.from(validParams.total).add(1)
        );
        await expect(subject).to.have.revertedWith("panic code 0x11");
      });

      it("emits advancing to the BeneficiariesSetup phase", async () => {
        const subject = await distributionAsIssuer.advanceToBeneficiariesSetup(
          10
        );
        expect(subject)
          .to.emit(distribution, "Advance")
          .withArgs(DistributionPhase.BeneficiariesSetup);
      });
    });
  });

  describe("in the BeneficiariesSetup phase", async () => {
    const fee = BigNumber.from(10);

    beforeEach(async () => {
      // Deploy.
      await deployDistribution(validParams);
      // Mock ERC20 to have the right balance.
      erc20.balanceOf.returns(validParams.total);
      // Move to the correct phase.
      await distribution.advanceToFeeSetup();
      await distributionAsIssuer.advanceToBeneficiariesSetup(fee);
    });

    describe("with beneficiaries properly added", async () => {
      describe("advanceToWithdrawal", async () => {
        beforeEach(async () => {
          // Allocate exactly the right funds.
          await distributionAsIssuer.addBeneficiaries(
            [alice.address, bob.address],
            [40, 50]
          );
        });

        it("requires the distribution to be in the BeneficiariesSetup phase");

        it("requires the caller to be a manager", async () => {
          const subject = distribution.advanceToWithdrawal();
          await expect(subject).to.have.revertedWith("RequiresManagerCaller");
        });

        it("is allowed by an automaton with the right privileges", async () => {
          erc20.transfer.returns(true);
          fast.automatonCan
            .whenCalledWith(
              automaton.address,
              FastAutomatonPrivilege.ManageDistributions
            )
            .returns(true);
          await distributionAsAutomaton.advanceToWithdrawal();
          const subject = await distribution.phase();
          expect(subject).to.be.eq(DistributionPhase.Withdrawal);
        });

        it("requires the right privileges for an automaton", async () => {
          fast.automatonCan
            .whenCalledWith(
              automaton.address,
              FastAutomatonPrivilege.ManageDistributions
            )
            .returns(false);
          const subject = distributionAsAutomaton.advanceToWithdrawal();
          await expect(subject).to.have.revertedWith("RequiresManagerCaller");
        });

        it("requires that all available funds have been attributed", async () => {
          await distributionAsIssuer.removeBeneficiaries([bob.address]);
          const subject = distributionAsIssuer.advanceToWithdrawal();
          await expect(subject).to.have.revertedWith("Overfunded");
        });

        it("delegates to the ERC20.transfer method to move the fee to the issuer", async () => {
          erc20.transfer.returns(true);
          await distributionAsIssuer.advanceToWithdrawal();
          expect(erc20.transfer).to.have.been.calledOnceWith(
            issuer.address,
            fee
          );
        });

        it("reverts if the fee cannot be moved", async () => {
          erc20.transfer.returns(false);
          const subject = distributionAsIssuer.advanceToWithdrawal();
          expect(subject).to.have.revertedWith("TokenContractError");
        });

        it("emits advancing to the Withdrawal phase", async () => {
          erc20.transfer.returns(true);
          const subject = distributionAsIssuer.advanceToWithdrawal();
          await expect(subject)
            .to.emit(distribution, "Advance")
            .withArgs(DistributionPhase.Withdrawal);
        });
      });

      describe("addBeneficiaries", async () => {
        it("requires the distribution to be in the BeneficiariesSetup phase");

        it("requires the caller to be a manger", async () => {
          const subject = distribution.addBeneficiaries([ben.address], [1]);
          await expect(subject).to.have.revertedWith("RequiresManagerCaller");
        });

        it("checks the length of beneficiaries and amounts", async () => {
          const subject = distributionAsIssuer.addBeneficiaries(
            [alice.address],
            []
          );
          await expect(subject).to.have.revertedWith("InconsistentParameter");
        });

        it("delegates to the FAST contract for membership checks", async () => {
          await distributionAsIssuer.addBeneficiaries([alice.address], [1]);
          expect(fast.isMember).to.have.been.calledOnce;
        });

        it("reverts when a beneficiary isn't a member of the FAST", async () => {
          const subject = distributionAsIssuer.addBeneficiaries(
            [ben.address],
            [1]
          );
          await expect(subject).to.have.revertedWith("RequiresFastMembership");
        });

        it("adds the beneficiaries to the list", async () => {
          await distributionAsIssuer.addBeneficiaries(
            [alice.address, bob.address],
            [1, 2]
          );
          await distributionAsIssuer.addBeneficiaries([paul.address], [3]);
          const [beneficiaries] = await distribution.paginateBeneficiaries(
            0,
            3
          );
          expect(beneficiaries).to.eql([
            alice.address,
            bob.address,
            paul.address,
          ]);
        });

        it("doesn't allow adding the same beneficiary twice", async () => {
          await distributionAsIssuer.addBeneficiaries(
            [alice.address, bob.address],
            [1, 2]
          );
          const subject = distributionAsIssuer.addBeneficiaries(
            [alice.address],
            [3]
          );
          await expect(subject).to.have.revertedWith("Address already in set");
        });

        it("keeps track of the owings", async () => {
          const owings = [BigNumber.from(1), BigNumber.from(2)];
          await distributionAsIssuer.addBeneficiaries(
            [alice.address, bob.address],
            owings
          );
          const subject = await Promise.all([
            distribution.owings(alice.address),
            distribution.owings(bob.address),
          ]);
          expect(subject).to.eql(owings);
        });

        it("emits as BeneficiaryAdded event per beneficiary", async () => {
          const subject = distributionAsIssuer.addBeneficiaries(
            [alice.address],
            [1]
          );
          await expect(subject)
            .to.emit(distribution, "BeneficiaryAdded")
            .withArgs(alice.address, 1);
        });

        it("checks that the needed amounts are not getting over the available funds", async () => {
          const subject = distributionAsIssuer.addBeneficiaries(
            [alice.address, bob.address],
            [40, 51]
          );
          await expect(subject).to.have.revertedWith("InsufficientFunds");
        });
      });

      describe("removeBeneficiaries", async () => {
        beforeEach(async () => {
          // Allocate exactly the right funds.
          await distributionAsIssuer.addBeneficiaries(
            [alice.address, bob.address, paul.address],
            [20, 30, 40]
          );
        });

        it("requires the distribution to be in the BeneficiariesSetup phase");

        it("requires the caller to be a manager", async () => {
          const subject = distribution.removeBeneficiaries([alice.address]);
          await expect(subject).to.have.revertedWith("RequiresManagerCaller");
        });

        it("is allowed by an automaton with the right privileges", async () => {
          fast.automatonCan
            .whenCalledWith(
              automaton.address,
              FastAutomatonPrivilege.ManageDistributions
            )
            .returns(true);
          await distributionAsAutomaton.removeBeneficiaries([
            alice.address,
            bob.address,
          ]);
          const [subject] = await distributionAsAutomaton.paginateBeneficiaries(
            0,
            2
          );
          expect(subject).to.eql([paul.address]);
        });

        it("requires the right privileges for an automaton", async () => {
          fast.automatonCan
            .whenCalledWith(
              automaton.address,
              FastAutomatonPrivilege.ManageDistributions
            )
            .returns(false);
          const subject = distributionAsAutomaton.removeBeneficiaries([
            alice.address,
          ]);
          await expect(subject).to.have.revertedWith("RequiresManagerCaller");
        });

        it("removes the beneficiaries from the list", async () => {
          await distributionAsIssuer.removeBeneficiaries([
            alice.address,
            paul.address,
          ]);
          const [beneficiaries] = await distribution.paginateBeneficiaries(
            0,
            3
          );
          expect(beneficiaries).to.eql([bob.address]);
        });

        it("sets the removed beneficiaries' owings to zero", async () => {
          await distributionAsIssuer.removeBeneficiaries([alice.address]);
          const subject = await distribution.owings(alice.address);
          expect(subject).to.eq(BigNumber.from(0));
        });

        it("reclaims the unallocated funds", async () => {
          await distributionAsIssuer.removeBeneficiaries([
            alice.address,
            paul.address,
          ]);
          const subject = await distribution.available();
          expect(subject).to.eq(BigNumber.from(60));
        });

        it("emits a BeneficiaryAdded event", async () => {
          const subject = distributionAsIssuer.removeBeneficiaries([
            alice.address,
          ]);
          await expect(subject)
            .to.emit(distribution, "BeneficiaryRemoved")
            .withArgs(alice.address);
        });

        it("reverts when removing a beneficiary that doesn't exist", async () => {
          const subject = distributionAsIssuer.removeBeneficiaries([
            ben.address,
          ]);
          await expect(subject).to.have.revertedWith(
            "Address does not exist in set"
          );
        });
      });

      describe("beneficiaryCount", async () => {
        it("returns the correct count");
      });

      describe("paginateBeneficiaries", async () => {
        beforeEach(async () => {
          // Allocate exactly the right funds.
          await distributionAsIssuer.addBeneficiaries(
            [alice.address, bob.address, paul.address],
            [20, 30, 40]
          );
        });

        it("returns pages of beneficiaries", async () => {
          const [beneficiaries, nextCursor] =
            await distribution.paginateBeneficiaries(0, 3);
          // I know... Two assertions. It's fine, this is thoroughly tested.
          expect(beneficiaries).to.deep.eq([
            alice.address,
            bob.address,
            paul.address,
          ]);
          expect(nextCursor).to.eq(BigNumber.from(3));
        });
      });
    });
  });

  describe("in the Withdrawal phase", async () => {
    const fee = BigNumber.from(10);

    beforeEach(async () => {
      // Deploy.
      await deployDistribution(validParams);
      // Mock ERC20 to have the right balance.
      erc20.balanceOf.returns(validParams.total);
      // Move to the correct phase.
      await distribution.advanceToFeeSetup();
      await distributionAsIssuer.advanceToBeneficiariesSetup(fee);
      await distributionAsIssuer.addBeneficiaries(
        [alice.address, bob.address, paul.address],
        [20, 30, 40]
      );
      erc20.transfer.reset();
    });

    describe("withdraw", async () => {
      it("requires the distribution to be in the Withdrawal phase");

      describe("with unsuccessful ERC20 transfer", async () => {
        beforeEach(async () => {
          erc20.transfer.reset();
          erc20.transfer.returns(false);
        });

        it("reverts", async () => {
          const subject = distributionAsIssuer.advanceToWithdrawal();
          await expect(subject).to.have.revertedWith("TokenContractError");
        });
      });

      describe("with successful ERC20 transfer", async () => {
        beforeEach(async () => {
          erc20.transfer.reset();
          erc20.transfer.returns(true);
          await distributionAsIssuer.advanceToWithdrawal();
        });

        it("reverts if the beneficiary is unknown", async () => {
          const subject = distribution.withdraw(ben.address);
          await expect(subject).to.have.revertedWith("UnknownBeneficiary");
        });

        it("requires that the beneficiary hasn't already withdrawn", async () => {
          await distribution.withdraw(alice.address);
          const subject = distribution.withdraw(alice.address);
          await expect(subject).to.have.revertedWith("DuplicateEntry");
        });

        it("marks the withdrawal as done", async () => {
          await distribution.withdraw(alice.address);
          const subject = await distribution.withdrawn(alice.address);
          await expect(subject).to.eq(true);
        });

        it("delegates to ERC20.transfer method", async () => {
          erc20.transfer.reset();
          erc20.transfer.returns(true);
          await distribution.withdraw(alice.address);
          expect(erc20.transfer).to.have.been.calledOnceWith(
            alice.address,
            BigNumber.from(20)
          );
        });

        it("emits a Withdrawal event", async () => {
          const subject = distribution
            .connect(deployer)
            .withdraw(alice.address);
          await expect(subject)
            .to.emit(distribution, "Withdrawal")
            .withArgs(deployer.address, alice.address, BigNumber.from(20));
        });
      });
    });
  });

  describe("terminate", async () => {
    beforeEach(async () => {
      await deployDistribution(validParams);

      erc20.balanceOf.reset();
      erc20.balanceOf
        .whenCalledWith(distribution.address)
        .returns(validParams.total);
    });

    it("reverts if the distribution has already been terminated");

    it("can be called during the Funding phase", async () => {
      const beforePhase = await distribution.phase();

      await distributionAsIssuer.terminate();
      const afterPhase = await distribution.phase();
      expect([beforePhase, afterPhase]).to.eql([
        DistributionPhase.Funding,
        DistributionPhase.Terminated,
      ]);
    });

    it("can be called during the FeeSetup phase", async () => {
      await distribution.advanceToFeeSetup();
      const beforePhase = await distribution.phase();

      await distributionAsIssuer.terminate();
      const afterPhase = await distribution.phase();
      expect([beforePhase, afterPhase]).to.eql([
        DistributionPhase.FeeSetup,
        DistributionPhase.Terminated,
      ]);
    });

    it("can be called during the BeneficiariesSetup phase", async () => {
      await distribution.advanceToFeeSetup();
      await distributionAsIssuer.advanceToBeneficiariesSetup(10);
      const beforePhase = await distribution.phase();

      await distributionAsIssuer.terminate();
      const afterPhase = await distribution.phase();
      expect([beforePhase, afterPhase]).to.eql([
        DistributionPhase.BeneficiariesSetup,
        DistributionPhase.Terminated,
      ]);
    });

    it("can be called during the Withdrawal phase", async () => {
      await distribution.advanceToFeeSetup();
      await distributionAsIssuer.advanceToBeneficiariesSetup(10);
      await distributionAsIssuer.addBeneficiaries(
        [alice.address, bob.address],
        [40, 50]
      );
      erc20.transfer.reset();
      erc20.transfer.returns(true);
      await distributionAsIssuer.advanceToWithdrawal();
      const beforePhase = await distribution.phase();

      await distributionAsIssuer.terminate();
      const afterPhase = await distribution.phase();
      expect([beforePhase, afterPhase]).to.eql([
        DistributionPhase.Withdrawal,
        DistributionPhase.Terminated,
      ]);
    });

    it("cannot be called during the Terminated phase", async () => {
      await distributionAsIssuer.terminate();
      const subject = distributionAsIssuer.terminate();
      await expect(subject).to.have.revertedWith("InvalidPhase");
    });

    it("requires that the caller is a manager", async () => {
      const subject = distribution.terminate();
      await expect(subject).to.have.revertedWith("RequiresManagerCaller");
    });

    it("is allowed by an automaton with the right privileges", async () => {
      fast.automatonCan
        .whenCalledWith(
          automaton.address,
          FastAutomatonPrivilege.ManageDistributions
        )
        .returns(true);
      await distributionAsAutomaton.terminate();
      const subject = await distribution.phase();
      expect(subject).to.be.eq(DistributionPhase.Terminated);
    });

    it("requires the right privileges for an automaton", async () => {
      fast.automatonCan
        .whenCalledWith(
          automaton.address,
          FastAutomatonPrivilege.ManageDistributions
        )
        .returns(false);
      const subject = distributionAsAutomaton.terminate();
      await expect(subject).to.have.revertedWith("RequiresManagerCaller");
    });

    it("sets the available amount to zero", async () => {
      await distributionAsIssuer.terminate();
      const subject = await distribution.available();
      expect(subject).to.be.eq(0);
    });

    it("calls the ERC20.transfer method to return the remaining balance to the distributor", async () => {
      await distributionAsIssuer.terminate();
      expect(erc20.transfer).to.have.been.calledOnceWith(governor.address, 100);
    });

    it("emits an Advance event", async () => {
      const subject = distributionAsIssuer.terminate();
      await expect(subject)
        .to.emit(distribution, "Advance")
        .withArgs(DistributionPhase.Terminated);
    });
  });
});
