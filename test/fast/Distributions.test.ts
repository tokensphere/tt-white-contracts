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
chai.use(solidity);
chai.use(smock.matchers);

describe.only("Distributions", () => {
  let
    deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress,
    automaton: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress;

  let
    issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    fast: FakeContract<Fast>,
    distribution: Distribution,
    deployDistribution: (params: Distribution.ParamsStruct) => void,
    validDistributionParams: Distribution.ParamsStruct,
    erc20: FakeContract<IERC20>;

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, automaton, alice, bob] = await ethers.getSigners();
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
    fast.automatonCan.reset();
    fast.automatonCan.returns(true);

    erc20.balanceOf.reset();
    erc20.transfer.reset();

    await hre.network.provider.request({ method: 'hardhat_impersonateAccount', params: [fast.address] });
    await ethers.provider.send("hardhat_setBalance", [fast.address, "0xfffffffffffffffffff"]);

    validDistributionParams = {
      distributor: governor.address,
      issuer: issuer.address,
      fast: fast.address,
      token: erc20.address,
      total: BigNumber.from(100),
      blockLatch: BigNumber.from(0)
    };

    deployDistribution = async (params) => {
      // Deploy the Distribution contract.
      const factory = await ethers.getContractFactory<Distribution__factory>("Distribution");
      distribution =
        await factory
          .connect(await ethers.getSigner(fast.address))
          .deploy({ ...params, fast: fast.address });
    }
  });

  // After each test, we want to stop impersonating the FAST contract address and unfund it.
  afterEach(async () => {
    // hre.network.provider.request({ method: 'hardhat_stopImpersonatingAccount', params: [fast.address] });
    // await ethers.provider.send("hardhat_setBalance", [fast.address, "0x0"]);
  });

  describe("constructor", async () => {
    describe("with the correct params passed", async () => {
      beforeEach(async () => {
        await deployDistribution(validDistributionParams);
      });

      it("requires the caller to be the FAST contract");

      it("stores its initial parameters", async () => {
        const subject = abiStructToObj(await distribution.params());

        expect(subject).to.eql({
          distributor: governor.address,
          issuer: issuer.address,
          fast: fast.address,
          token: erc20.address,
          total: validDistributionParams.total,
          blockLatch: validDistributionParams.blockLatch
        });
      });

      it("initializes the `available` funds using the initial `total`", async () => {
        const subject = await distribution.available();
        expect(subject).to.eq(validDistributionParams.total);
      });

      it("stores the creation block", async () => {
        const latestBlockNumber = (await ethers.provider.getBlock("latest")).number;
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
        const latestBlockNumber = (await ethers.provider.getBlock("latest")).number;
        const subject = deployDistribution({ ...validDistributionParams, blockLatch: latestBlockNumber + 10 });
        await expect(subject).to.have.been
          .revertedWith("InvalidBlockNumber");
      });
    });
  });

  describe("in the Funding phase", async () => {
    beforeEach(async () => {
      await deployDistribution(validDistributionParams);
      erc20.balanceOf.whenCalledWith(distribution.address).returns(validDistributionParams.total);
    });

    describe("advanceToFeeSetup", async () => {
      it("requires the distribution to be in the Funding phase");

      it("requires the caller to be the FAST contract", async () => {
        const subject = distribution.connect(bob).advanceToFeeSetup();
        await expect(subject).to.have
          .revertedWith("RequiresFastCaller");
      });

      it("delegates to the ERC20 contract to retrieve the distribution token balance", async () => {
        await distribution.advanceToFeeSetup();
        expect(erc20.balanceOf).to.have.been.calledOnceWith(distribution.address)
      });

      it("checks that the token balance is equal to the total (minus)", async () => {
        // Make the ERC20 balance too low.
        erc20.balanceOf.whenCalledWith(distribution.address).returns(BigNumber.from(validDistributionParams.total).sub(1));
        const subject = distribution.advanceToFeeSetup();
        expect(subject).to.have
          .revertedWith("UnsupportedOperation");
      });

      it("checks that the token balance is equal to the total (plus)", async () => {
        // Make the ERC20 balance too low.
        erc20.balanceOf.whenCalledWith(distribution.address).returns(BigNumber.from(validDistributionParams.total).add(1));
        const subject = distribution.advanceToFeeSetup();
        expect(subject).to.have
          .revertedWith("UnsupportedOperation");
      });

      it("emits advancing to the FeeSetup phase", async () => {
        const subject = await distribution.advanceToFeeSetup();
        expect(subject).to
          .emit(distribution, "Advance")
          .withArgs(DistributionPhase.FeeSetup);
      });
    });
  });

  describe("in the FeeSetup phase", async () => {
    beforeEach(async () => {
      // Deploy.
      await deployDistribution(validDistributionParams);
      // Mock balance.
      erc20.balanceOf.returns(validDistributionParams.total);
      // Advance to correct phase.
      await distribution.advanceToFeeSetup();
    });

    describe("advanceToBeneficiariesSetup", async () => {
      it("requires the distribution to be in the FeeSetup phase");

      it("requires the caller to be a manager", async () => {
        const subject = distribution.advanceToBeneficiariesSetup(validDistributionParams.total);
        await expect(subject).to.have.revertedWith("RequiresManagerCaller");
      });


      it("sets the fee", async () => {
        await distribution.connect(issuerMember).advanceToBeneficiariesSetup(10);
        const subject = await distribution.fee();
        expect(subject).to.eq(10);
      });

      it("underflow if the fee is too large", async () => {
        const subject = distribution.connect(issuerMember).advanceToBeneficiariesSetup(BigNumber.from(validDistributionParams.total).add(1));
        await expect(subject).to.have.revertedWith("panic code 0x11");
      });

      it("emits advancing to the BeneficiariesSetup phase", async () => {
        const subject = await distribution.connect(issuerMember).advanceToBeneficiariesSetup(10);
        expect(subject).to
          .emit(distribution, "Advance")
          .withArgs(DistributionPhase.BeneficiariesSetup);
      });
    });
  });

  describe("in the BeneficiariesSetup phase", async () => {
    const fee = BigNumber.from(10);

    beforeEach(async () => {
      // Deploy.
      await deployDistribution(validDistributionParams);
      // Mock ERC20 to have the right balance.
      erc20.balanceOf.returns(validDistributionParams.total);
      // Move to the correct phase.
      await distribution.advanceToFeeSetup();
      await distribution.connect(issuerMember).advanceToBeneficiariesSetup(fee);
      // Allocate exactly the right funds.
      await distribution.connect(issuerMember).addBeneficiaries([alice.address, bob.address], [40, 50])
    });

    describe("advanceToWithdrawal", async () => {
      it("requires the distribution to be in the BeneficiariesSetup phase");

      it("requires the caller to be a manager", async () => {
        const subject = distribution.advanceToWithdrawal();
        await expect(subject).to.have.revertedWith("RequiresManagerCaller");
      });

      it("requires that all available funds have been attributed", async () => {
        await distribution.connect(issuerMember).removeBeneficiaries([bob.address])
        const subject = distribution.connect(issuerMember).advanceToWithdrawal();
        await expect(subject).to.have
          .revertedWith("Overfunded");
      });

      it("delegates to the ERC20.transfer method to move the fee to the issuer", async () => {
        erc20.transfer.returns(true);
        await distribution.connect(issuerMember).advanceToWithdrawal();
        expect(erc20.transfer).to.have.been
          .calledOnceWith(issuer.address, fee);
      });

      it("reverts if the fee cannot be moved", async () => {
        erc20.transfer.returns(false);
        const subject = distribution.connect(issuerMember).advanceToWithdrawal();
        expect(subject).to.have
          .revertedWith("TokenContractError");
      });

      it("emits advancing to the Withdrawal phase", async () => {
        erc20.transfer.returns(true);
        const subject = distribution.connect(issuerMember).advanceToWithdrawal();
        await expect(subject).to
          .emit(distribution, "Advance")
          .withArgs(DistributionPhase.Withdrawal);
      });
    });
  });

  // describe("addBeneficiaries", async () => {
  //   let distribution: MockContract<Distribution>,
  //     issuerDistribution: MockContract<Distribution>,
  //     governorDistribution: MockContract<Distribution>;

  //   const totalFunds = 10;

  //   beforeEach(async () => {
  //     // Stub out the ERC20 contract.
  //     erc20.balanceOf.reset();
  //     erc20.balanceOf.returns(10);
  //     erc20.transfer.reset();
  //     erc20.transfer.returns(true);

  //     // Deploy the Distribution contract.
  //     const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

  //     distribution = await factory.deploy({
  //       distributor: governor.address,
  //       issuer: issuer.address,
  //       fast: fast.address,
  //       token: erc20.address,
  //       total: totalFunds,
  //       blockLatch: 1
  //     });

  //     governorDistribution = distribution.connect(governor);
  //     issuerDistribution = distribution.connect(issuerMember);
  //   });

  //   it("requires that the phase is BeneficiariesSetup", async () => {
  //     // The fee hasn't been set yet, so the phase is still FeeSetup.
  //     // TODO: Maybe make this more explicit.
  //     const subject = issuerDistribution.addBeneficiaries([alice.address], [1]);
  //     expect(subject).to.have.been
  //       .revertedWith("UnsupportedOperation");
  //   });

  //   it("requires that the caller is a distribution manager", async () => {
  //     // TODO: Add some kind of random number for the fee?
  //     await issuerDistribution.setFee(3);

  //     const subject = governorDistribution.addBeneficiaries([alice.address], [1]);
  //     expect(subject).to.have.been
  //       .revertedWith("RequiresIssuerMembership");
  //   });

  //   it("enforces that the list of beneficiaries matches the list of amounts", async () => {
  //     await issuerDistribution.setFee(6);

  //     const subject = issuerDistribution.addBeneficiaries([alice.address], [1, 2]);
  //     expect(subject).to.have.been
  //       .revertedWith("UnsupportedOperation");
  //   });

  //   it("ensures that the needed amount doesn't get past the available funds", async () => {
  //     await issuerDistribution.setFee(6);

  //     // Make Alice a member of the Fast... in her dreams!
  //     accessMock.isMember.reset();
  //     accessMock.isMember.whenCalledWith(alice.address).returns(true);

  //     const subject = issuerDistribution.addBeneficiaries([alice.address], [5]);
  //     expect(subject).to.have.been
  //       .revertedWith("InsufficientFunds");
  //   });

  //   it("adds the beneficiaries to the internal list along with their correct owings", async () => {
  //     await issuerDistribution.setFee(6);

  //     // Make Alice a member of the Fast... in her dreams!
  //     accessMock.isMember.reset();
  //     accessMock.isMember.whenCalledWith(alice.address).returns(true);

  //     // Add them.
  //     await issuerDistribution.addBeneficiaries([alice.address], [2]);

  //     // Check that Alice belongs to the list.
  //     const [[beneficiary]] = await distribution.paginateBeneficiaries(0, 1);
  //     expect(beneficiary).to.be.eq(alice.address);
  //   });

  //   it("emits as many BeneficiaryAdded events as there are beneficiaries added", async () => {
  //     await issuerDistribution.setFee(6);

  //     // Make Alice a member of the Fast... in her dreams!
  //     accessMock.isMember.reset();
  //     accessMock.isMember.whenCalledWith(alice.address).returns(true);

  //     // Add them.
  //     const subject = issuerDistribution.addBeneficiaries([alice.address], [2]);

  //     await expect(subject).to.emit(distribution, "BeneficiaryAdded");
  //   });

  //   it("updates the available funds after adding all the beneficiaries", async () => {
  //     await issuerDistribution.setFee(6);

  //     // Make Alice a member of the Fast... in her dreams!
  //     accessMock.isMember.reset();
  //     accessMock.isMember.whenCalledWith(alice.address).returns(true);

  //     await issuerDistribution.addBeneficiaries([alice.address], [2]);

  //     const subject = await distribution.available();
  //     expect(subject).to.eq(10 - 6 - 2);
  //   });

  //   it("can be called several times with different beneficiaries", async () => {
  //     await issuerDistribution.setFee(6);

  //     // Make Alice and Bob a member of the Fast.
  //     accessMock.isMember.reset();
  //     accessMock.isMember.whenCalledWith(alice.address).returns(true);
  //     accessMock.isMember.whenCalledWith(bob.address).returns(true);

  //     await issuerDistribution.addBeneficiaries([alice.address, bob.address], [2, 1]);

  //     // Check that Alice and Bob are both in the list.
  //     const [beneficiaries] = await distribution.paginateBeneficiaries(0, 2);
  //     expect(beneficiaries).to.be.eql([alice.address, bob.address]);
  //   });

  //   it("reverts if a beneficiary is added twice", async () => {
  //     await issuerDistribution.setFee(6);

  //     // Make Alice a member of the Fast.
  //     accessMock.isMember.reset();
  //     accessMock.isMember.whenCalledWith(alice.address).returns(true);

  //     // Try and add Alice twice.
  //     const subject = issuerDistribution.addBeneficiaries([alice.address, alice.address], [2, 1]);
  //     await expect(subject).to.have.been
  //       .revertedWith("Address already in set");
  //   });
  // });

  // describe("removeBeneficiaries", async () => {
  //   let distribution: MockContract<Distribution>,
  //     issuerDistribution: MockContract<Distribution>,
  //     governorDistribution: MockContract<Distribution>;

  //   const totalFunds = 10;

  //   beforeEach(async () => {
  //     // Stub out the ERC20 contract.
  //     erc20.balanceOf.reset();
  //     erc20.balanceOf.returns(10);
  //     erc20.transfer.reset();
  //     erc20.transfer.returns(true);

  //     // Deploy the Distribution contract.
  //     const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

  //     distribution = await factory.deploy({
  //       distributor: governor.address,
  //       issuer: issuer.address,
  //       fast: fast.address,
  //       token: erc20.address,
  //       total: totalFunds,
  //       blockLatch: 1
  //     });

  //     governorDistribution = distribution.connect(governor);
  //     issuerDistribution = distribution.connect(issuerMember);
  //   });

  //   it("requires that the phase is BeneficiariesSetup", async () => {
  //     // We haven't set the fee yet so this should revert.
  //     const subject = issuerDistribution.removeBeneficiaries([alice.address]);
  //     await expect(subject).to.have.been
  //       .revertedWith("UnsupportedOperation");
  //   });

  //   it("requires that the caller is a distribution manager", async () => {
  //     await issuerDistribution.setFee(2);

  //     const subject = governorDistribution.removeBeneficiaries([alice.address]);
  //     await expect(subject).to.have.been
  //       .revertedWith("RequiresIssuerMembership");
  //   });

  //   it("removes given beneficiaries and their owings", async () => {
  //     // Setup.
  //     await issuerDistribution.setFee(2);
  //     accessMock.isMember.reset();
  //     accessMock.isMember.whenCalledWith(alice.address).returns(true);

  //     // Add Alice as a beneficiary.
  //     await issuerDistribution.addBeneficiaries([alice.address], [1]);

  //     // Remove Alice.
  //     await issuerDistribution.removeBeneficiaries([alice.address]);

  //     const [beneficiaries] = await distribution.paginateBeneficiaries(0, 1);
  //     expect(beneficiaries).to.be.eql([]);
  //   });

  //   it("reclaims the unused funds as part of the available funds tracker", async () => {
  //     // Setup.
  //     const amount = 2;

  //     await issuerDistribution.setFee(2);
  //     accessMock.isMember.reset();
  //     accessMock.isMember.whenCalledWith(alice.address).returns(true);

  //     // Add Alice as a beneficiary.
  //     await issuerDistribution.addBeneficiaries([alice.address], [amount]);

  //     const availableBefore = (await distribution.available()).toNumber();

  //     // Remove Alice, increasing the available funds.
  //     await issuerDistribution.removeBeneficiaries([alice.address]);

  //     const availableAfter = (await distribution.available()).toNumber();

  //     expect(availableBefore).to.be.eq(availableAfter - amount);
  //   });

  //   it("reverts if a beneficiary cannot be removed because it is not present", async () => {
  //     await issuerDistribution.setFee(2);
  //     accessMock.isMember.reset();
  //     accessMock.isMember.whenCalledWith(alice.address).returns(true);

  //     // Remove Alice, this should raise an error.
  //     const subject = issuerDistribution.removeBeneficiaries([alice.address]);

  //     await expect(subject).to.have.been
  //       .revertedWith("Address does not exist in set");
  //   });

  //   it("emits as many BeneficiaryRemoved events as there are beneficiaries removed", async () => {
  //     await issuerDistribution.setFee(2);
  //     accessMock.isMember.reset();
  //     accessMock.isMember.whenCalledWith(alice.address).returns(true);

  //     // Add and remove Alice as a beneficiary.
  //     await issuerDistribution.addBeneficiaries([alice.address], [2]);
  //     const subject = issuerDistribution.removeBeneficiaries([alice.address]);

  //     await expect(subject).to.emit(distribution, "BeneficiaryRemoved");
  //   });
  // });

  // describe("paginateBeneficiaries", async () => {
  //   // I LOVE COPYING AND PASTING THIS ALL OVER THE PLACE... HINT HINT...
  //   let distribution: MockContract<Distribution>,
  //     issuerDistribution: MockContract<Distribution>,
  //     governorDistribution: MockContract<Distribution>;

  //   const totalFunds = 10;

  //   beforeEach(async () => {
  //     // Stub out the ERC20 contract.
  //     erc20.balanceOf.reset();
  //     erc20.balanceOf.returns(10);
  //     erc20.transfer.reset();
  //     erc20.transfer.returns(true);

  //     // Deploy the Distribution contract.
  //     const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

  //     distribution = await factory.deploy({
  //       distributor: governor.address,
  //       issuer: issuer.address,
  //       fast: fast.address,
  //       token: erc20.address,
  //       total: totalFunds,
  //       blockLatch: 1
  //     });

  //     governorDistribution = distribution.connect(governor);
  //     issuerDistribution = distribution.connect(issuerMember);
  //   });

  //   it("returns pages of beneficiaries", async () => {
  //     await issuerDistribution.setFee(2);
  //     accessMock.isMember.reset();
  //     accessMock.isMember.whenCalledWith(alice.address).returns(true);

  //     // Add Alice as a beneficiary.
  //     await issuerDistribution.addBeneficiaries([alice.address], [2]);

  //     const [beneficiaries] = await distribution.paginateBeneficiaries(0, 1);
  //     expect(beneficiaries).to.be.eql([alice.address]);
  //   });
  // });

  // describe("withdraw", async () => {
  //   let distribution: MockContract<Distribution>,
  //     issuerDistribution: MockContract<Distribution>,
  //     aliceDistribution: MockContract<Distribution>,
  //     bobDistribution: MockContract<Distribution>;

  //   const totalFunds = 10;

  //   beforeEach(async () => {
  //     // Stub out the ERC20 contract.
  //     erc20.balanceOf.reset();
  //     erc20.balanceOf.returns(10);
  //     erc20.transfer.reset();
  //     erc20.transfer.returns(true);

  //     // Deploy the Distribution contract.
  //     const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

  //     distribution = await factory.deploy({
  //       distributor: governor.address,
  //       issuer: issuer.address,
  //       fast: fast.address,
  //       token: erc20.address,
  //       total: totalFunds,
  //       blockLatch: 1
  //     });

  //     aliceDistribution = distribution.connect(alice);
  //     bobDistribution = distribution.connect(bob);
  //     issuerDistribution = distribution.connect(issuerMember);

  //     await issuerDistribution.setFee(2);
  //     accessMock.isMember.reset();
  //     accessMock.isMember.whenCalledWith(alice.address).returns(true);

  //     // Add Alice as a beneficiary.
  //     await issuerDistribution.addBeneficiaries([alice.address], [8]);

  //     // Advance to the Withdrawl phase.
  //     await issuerDistribution.advance();
  //   });

  //   it("requires that the caller is a known beneficiary", async () => {
  //     const subject = bobDistribution.withdraw(bob.address);
  //     await expect(subject).to.be
  //       .revertedWith("NonExistentEntry");
  //   });

  //   it("reverts if the withdrawal already has been made", async () => {
  //     aliceDistribution = distribution.connect(alice);
  //     // Withdraw once.
  //     await aliceDistribution.withdraw(alice.address);

  //     // Attempt to withdraw again.
  //     const subject = aliceDistribution.withdraw(alice.address);
  //     await expect(subject).to.be
  //       .revertedWith("DuplicateEntry");
  //   });

  //   it("can be called on behalf of someone by anyone else", async () => {
  //     // Bob is going to withdraw on behalf of Alice... to Alice.
  //     await bobDistribution.withdraw(alice.address);

  //     // The ERC20 should have it's transfer function called with Alice's address.
  //     expect(erc20.transfer).to.have.been
  //       .calledWith(alice.address, 8);
  //   });

  //   it("transfers the ERC20 token to the given beneficiary", async () => {
  //     // Alice attempts to withdraw.
  //     await aliceDistribution.withdraw(alice.address);

  //     // The ERC20 should have it's transfer function called with Alice's address.
  //     expect(erc20.transfer).to.have.been
  //       .calledWith(alice.address, 8);
  //   });

  //   it("emits a Withdrawal event", async () => {
  //     const subject = aliceDistribution.withdraw(alice.address);

  //     await expect(subject).to.emit(distribution, "Withdrawal");
  //   });
  // });

  // describe("terminate", async () => {
  //   // TODO: Fix this duplication please...
  //   let distribution: MockContract<Distribution>,
  //     issuerDistribution: MockContract<Distribution>,
  //     aliceDistribution: MockContract<Distribution>;

  //   const totalFunds = 10;

  //   beforeEach(async () => {
  //     // Stub out the ERC20 contract.
  //     erc20.balanceOf.reset();
  //     erc20.balanceOf.returns(10);
  //     erc20.transfer.reset();
  //     erc20.transfer.returns(true);

  //     // Deploy the Distribution contract.
  //     const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

  //     distribution = await factory.deploy({
  //       distributor: governor.address,
  //       issuer: issuer.address,
  //       fast: fast.address,
  //       token: erc20.address,
  //       total: totalFunds,
  //       blockLatch: 1
  //     });

  //     aliceDistribution = distribution.connect(alice);
  //     issuerDistribution = distribution.connect(issuerMember);

  //     await issuerDistribution.setFee(2);
  //     accessMock.isMember.reset();
  //     accessMock.isMember.whenCalledWith(alice.address).returns(true);
  //   });

  //   it("requires the caller to be a distribution manager", async () => {
  //     const subject = aliceDistribution.terminate();
  //     await expect(subject).to.be
  //       .revertedWith("RequiresIssuerMembership");
  //   });

  //   it("advances to the Terminated phase", async () => {
  //     await issuerDistribution.terminate();
  //     const subject = await distribution.phase();
  //     expect(subject).to.be.eq(DistributionPhase.Terminated);
  //   });

  //   it("transfers all unclaimed ERC20 funds back to the distributor", async () => {
  //     await issuerDistribution.terminate();

  //     // The ERC20 should have it's transfer function called with the Issuer's address.
  //     expect(erc20.transfer).to.have.been
  //       .calledOnceWith(governor.address, 10);
  //   });

  //   it("sets the available funds to zero", async () => {
  //     await issuerDistribution.terminate();

  //     const subject = await distribution.available();
  //     expect(subject).to.be.eq(0);
  //   });
  // });

  describe("various synthesized getters", async () => {
    beforeEach(async () => {
      await deployDistribution(validDistributionParams);
    });

    it("expose VERSION", async () => {
      expect(await distribution.VERSION()).to.be.eq(1);
    });

    it("expose initial params", async () => {
      const originalParams = await distribution.params();
      const params = abiStructToObj(originalParams);

      expect(params).to.eql({
        distributor: governor.address,
        issuer: issuer.address,
        fast: fast.address,
        token: erc20.address,
        total: BigNumber.from(validDistributionParams.total),
        blockLatch: BigNumber.from(validDistributionParams.blockLatch)
      });
    });

    it("expose phase", async () => {
      const subject = await distribution.phase();
      expect(subject).to.be.eq(DistributionPhase.Funding);
    });

    it("expose creationBlock", async () => {
      const latestBlockNumber = (await ethers.provider.getBlock("latest")).number;
      const subject = await distribution.creationBlock()
      expect(subject).to.be.eq(latestBlockNumber);
    });

    it("expose fee", async () => {
      const subject = await distribution.fee();
      expect(subject).to.be.eq(0);
    });

    it("expose available", async () => {
      const subject = await distribution.available()
      expect(subject).to.be.eq(validDistributionParams.total);
    });
  });
});
