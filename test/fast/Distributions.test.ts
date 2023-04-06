import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { FakeContract, MockContract, smock } from "@defi-wonderland/smock";
import { deployments, ethers } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import {
  Issuer,
  Marketplace,
  Distribution,
  Distribution__factory,
  IERC20,
  Fast,
  FastTokenFacet,
  FastAccessFacet
} from "../../typechain";
import { abiStructToObj, DistributionPhase } from "../utils";
import { fastFixtureFunc } from "../fixtures/fast";
chai.use(solidity);
chai.use(smock.matchers);

describe("Distributions", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress;

  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    fast: Fast,
    accessMock: MockContract<FastAccessFacet>,
    token: FastTokenFacet,
    erc20: FakeContract<IERC20>;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, alice, bob] = await ethers.getSigners();

    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");
    marketplace.issuerAddress.returns(issuer.address);

    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);

    marketplace.isMember.whenCalledWith(governor.address).returns(true);
    marketplace.isMember.returns(false);
    marketplace.isActiveMember.whenCalledWith(governor.address).returns(true);
    marketplace.isActiveMember.returns(false);

    // TODO: Totally forgotten about what I'm doing... I just want a generic ERC20.
    erc20 = await smock.fake("IERC20");
  });

  beforeEach(async () => {
    await fastDeployFixture({
      opts: {
        name: "FastTokenFixture_FIX_THE_NAMING",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ fast, accessMock } = args);
          token = await ethers.getContractAt<FastTokenFacet>("FastTokenFacet", fast.address);
        },
      },
      initWith: {
        issuer: issuer.address,
        marketplace: marketplace.address,
        governor: governor.address,
      },
    });
  });

  describe("constructor", async () => {
    describe("with the correct params passed", async () => {
      let distribution: MockContract<Distribution>;

      beforeEach(async () => {
        // Stub out the ERC20 contract.
        erc20.balanceOf.reset();
        erc20.balanceOf.returns(10);

        // Deploy the Distribution contract.
        const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

        distribution = await factory.deploy({
          distributor: governor.address,
          issuer: issuer.address,
          fast: fast.address,
          token: erc20.address,
          total: 10,
          blockLatch: 1
        });
      });

      it("stores its initial parameters", async () => {
        const originalParams = await distribution.params();
        const params = abiStructToObj(originalParams) as Distribution.ParamsStruct;

        expect(params).to.eql({
          distributor: governor.address,
          issuer: issuer.address,
          fast: fast.address,
          token: erc20.address,
          total: BigNumber.from(10),
          blockLatch: BigNumber.from(1)
        });
      });

      it("initializes the `available` funds using the initial `total`", async () => {
        const subject = await distribution.available();
        expect(subject).to.eq(BigNumber.from(10));
      });

      it("stores the creation block", async () => {
        const latestBlockNumber = (await ethers.provider.getBlock("latest")).number;
        const subject = await distribution.creationBlock();
        expect(subject).to.eq(BigNumber.from(latestBlockNumber));
      });

      it("delegates a call to balanceOf to the ERC20 token with the correct parameters", async () => {
        // TODO: Not super accurate... we've had multiple calls at this point.
        expect(erc20.balanceOf).to.have.been.calledWith(distribution.address);
      });

      it("advances to the FeeSetup phase", async () => {
        const subject = await distribution.phase();
        expect(subject).to.eq(DistributionPhase.FeeSetup);
      });
    });

    describe("reversions", async () => {
      it("reverts if the latched block is in the future", async () => {
        const totalFunds = 10;
        const latestBlockNumber = (await ethers.provider.getBlock("latest")).number;

        // Stub out the ERC20 contract.
        erc20.balanceOf.reset();
        erc20.balanceOf.returns(totalFunds);

        // Deploy the Distribution contract.
        const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

        const distribution = factory.deploy({
          distributor: governor.address,
          issuer: issuer.address,
          fast: fast.address,
          token: erc20.address,
          total: totalFunds,
          blockLatch: latestBlockNumber + 2
        });

        expect(distribution).to.have.been
          .revertedWith("UnsupportedOperation");
      });

      it("reverts if the available balance is not exactly equal to the total", async () => {
        // Set initial vars.
        const totalAllowedFunds = 8;
        const totalFunds = 10;

        erc20.balanceOf.reset();
        erc20.balanceOf.returns(totalAllowedFunds);

        // Deploy the Distribution contract.
        const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

        const distribution = factory.deploy({
          distributor: governor.address,
          issuer: issuer.address,
          fast: fast.address,
          token: erc20.address,
          total: totalFunds,
          blockLatch: 1
        });

        expect(distribution).to.have.been
          .revertedWith("InsufficientFunds");
      });
    });
  });

  describe("advance", async () => {
    let distribution: MockContract<Distribution>,
      issuerDistribution: MockContract<Distribution>,
      governorDistribution: MockContract<Distribution>;

    const fee = 1;

    beforeEach(async () => {
      // Stub out the ERC20 contract.
      erc20.balanceOf.reset();
      erc20.balanceOf.returns(10);
      erc20.transfer.reset();
      erc20.transfer.returns(true);

      // Deploy the Distribution contract.
      const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

      distribution = await factory.deploy({
        distributor: governor.address,
        issuer: issuer.address,
        fast: fast.address,
        token: erc20.address,
        total: 10,
        blockLatch: 1
      });

      governorDistribution = distribution.connect(governor);
      issuerDistribution = distribution.connect(issuerMember);

      // Set the fee - advancing the phase to BeneficiariesSetup.
      await issuerDistribution.setFee(fee);
    });

    describe("when transitioning from BeneficiariesSetup to Withdrawal", async () => {
      it("requires that the caller is a distribution manager", async () => {
        const subject = governorDistribution.advance();
        await expect(subject).to.have
          .revertedWith("RequiresIssuerMembership");
      });

      it("makes sure that all available funds have been attributed", async () => {
        const subject = issuerDistribution.advance();
        // TODO: Shouldn't this have a more specific error message?
        await expect(subject).to.have
          .revertedWith("UnsupportedOperation");
      });

      it("transfers the fee to the Issuer contract", async () => {
        // Drop the available funds to 0 and advance.
        distribution.setVariable("available", 0);
        await issuerDistribution.advance();

        expect(erc20.transfer).to.have.been
          .calledWith(issuer.address, fee);
      });

      it("advances to the Withdrawal phase", async () => {
        // Drop the available funds to 0 and advance.
        distribution.setVariable("available", 0);
        await issuerDistribution.advance();

        const subject = await distribution.phase();
        expect(subject).to.eq(DistributionPhase.Withdrawal);
      });
    })

    describe("otherwise", async () => {
      it("reverts for any other transition", async () => {
        // Mutate the underlying phase.
        // TODO: Fix this... can't be done.
        // distribution.setVariable("phase", 0);
        // ... for now terminate this distribution to force a different phase.
        await issuerDistribution.terminate();

        const subject = issuerDistribution.advance();
        await expect(subject).to.have
          .revertedWith("UnsupportedOperation");
      });
    });
  });

  describe("setFee", async () => {
    let distribution: MockContract<Distribution>,
      issuerDistribution: MockContract<Distribution>,
      governorDistribution: MockContract<Distribution>;

    const totalFunds = 10;

    beforeEach(async () => {
      // Stub out the ERC20 contract.
      erc20.balanceOf.reset();
      erc20.balanceOf.returns(10);
      erc20.transfer.reset();
      erc20.transfer.returns(true);

      // Deploy the Distribution contract.
      const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

      distribution = await factory.deploy({
        distributor: governor.address,
        issuer: issuer.address,
        fast: fast.address,
        token: erc20.address,
        total: totalFunds,
        blockLatch: 1
      });

      governorDistribution = distribution.connect(governor);
      issuerDistribution = distribution.connect(issuerMember);
    });

    it("requires that the phase is FeeSetup", async () => {
      // TODO: This is a hack to get around the phase, to force it to a different state.
      await issuerDistribution.terminate();

      const subject = issuerDistribution.setFee(3);
      await expect(subject).to.have.been
        .revertedWith("UnsupportedOperation");
    });

    it("requires that the caller is a distribution manager", async () => {
      const subject = governorDistribution.setFee(2);
      await expect(subject).to.have.been
        .revertedWith("RequiresIssuerMembership");
    });

    it("keeps track of the fee", async () => {
      await issuerDistribution.setFee(4);

      const subject = await distribution.fee();
      expect(subject).to.eq(4);
    });

    it("subtracts the fee from the available funds", async () => {
      const fee = 4;
      await issuerDistribution.setFee(fee);

      const expectedAvailable = totalFunds - fee;
      const subject = await distribution.available();
      expect(subject).to.eq(expectedAvailable);
    });

    it("advances to the BeneficiariesSetup phase", async () => {
      const fee = 5;
      await issuerDistribution.setFee(fee);

      const subject = await distribution.phase();
      expect(subject).to.eq(DistributionPhase.BeneficiariesSetup);
    });
  });

  describe("addBeneficiaries", async () => {
    let distribution: MockContract<Distribution>,
      issuerDistribution: MockContract<Distribution>,
      governorDistribution: MockContract<Distribution>;

    const totalFunds = 10;

    beforeEach(async () => {
      // Stub out the ERC20 contract.
      erc20.balanceOf.reset();
      erc20.balanceOf.returns(10);
      erc20.transfer.reset();
      erc20.transfer.returns(true);

      // Deploy the Distribution contract.
      const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

      distribution = await factory.deploy({
        distributor: governor.address,
        issuer: issuer.address,
        fast: fast.address,
        token: erc20.address,
        total: totalFunds,
        blockLatch: 1
      });

      governorDistribution = distribution.connect(governor);
      issuerDistribution = distribution.connect(issuerMember);
    });

    it("requires that the phase is BeneficiariesSetup", async () => {
      // The fee hasn't been set yet, so the phase is still FeeSetup.
      // TODO: Maybe make this more explicit.
      const subject = issuerDistribution.addBeneficiaries([alice.address], [1]);
      expect(subject).to.have.been
        .revertedWith("UnsupportedOperation");
    });

    it("requires that the caller is a distribution manager", async () => {
      // TODO: Add some kind of random number for the fee?
      await issuerDistribution.setFee(3);

      const subject = governorDistribution.addBeneficiaries([alice.address], [1]);
      expect(subject).to.have.been
        .revertedWith("RequiresIssuerMembership");
    });

    it("enforces that the list of beneficiaries matches the list of amounts", async () => {
      await issuerDistribution.setFee(6);

      const subject = issuerDistribution.addBeneficiaries([alice.address], [1, 2]);
      expect(subject).to.have.been
        .revertedWith("UnsupportedOperation");
    });

    it("ensures that the needed amount doesn't get past the available funds", async () => {
      await issuerDistribution.setFee(6);

      // Make Alice a member of the Fast... in her dreams!
      accessMock.isMember.reset();
      accessMock.isMember.whenCalledWith(alice.address).returns(true);

      const subject = issuerDistribution.addBeneficiaries([alice.address], [5]);
      expect(subject).to.have.been
        .revertedWith("InsufficientFunds");
    });

    it("adds the beneficiaries to the internal list along with their correct owings", async () => {
      await issuerDistribution.setFee(6);

      // Make Alice a member of the Fast... in her dreams!
      accessMock.isMember.reset();
      accessMock.isMember.whenCalledWith(alice.address).returns(true);

      // Add them.
      await issuerDistribution.addBeneficiaries([alice.address], [2]);

      // Check that Alice belongs to the list.
      const [[beneficiary]] = await distribution.paginateBeneficiaries(0, 1);
      expect(beneficiary).to.be.eq(alice.address);
    });

    it("emits as many BeneficiaryAdded events as there are beneficiaries added", async () => {
      await issuerDistribution.setFee(6);

      // Make Alice a member of the Fast... in her dreams!
      accessMock.isMember.reset();
      accessMock.isMember.whenCalledWith(alice.address).returns(true);

      // Add them.
      const subject = issuerDistribution.addBeneficiaries([alice.address], [2]);

      await expect(subject).to.emit(distribution, "BeneficiaryAdded");
    });

    it("updates the available funds after adding all the beneficiaries", async () => {
      await issuerDistribution.setFee(6);

      // Make Alice a member of the Fast... in her dreams!
      accessMock.isMember.reset();
      accessMock.isMember.whenCalledWith(alice.address).returns(true);

      await issuerDistribution.addBeneficiaries([alice.address], [2]);

      const subject = await distribution.available();
      expect(subject).to.eq(10 - 6 - 2);
    });

    it("can be called several times with different beneficiaries", async () => {
      await issuerDistribution.setFee(6);

      // Make Alice and Bob a member of the Fast.
      accessMock.isMember.reset();
      accessMock.isMember.whenCalledWith(alice.address).returns(true);
      accessMock.isMember.whenCalledWith(bob.address).returns(true);

      await issuerDistribution.addBeneficiaries([alice.address, bob.address], [2, 1]);

      // Check that Alice and Bob are both in the list.
      const [beneficiaries] = await distribution.paginateBeneficiaries(0, 2);
      expect(beneficiaries).to.be.eql([alice.address, bob.address]);
    });

    it("reverts if a beneficiary is added twice", async () => {
      await issuerDistribution.setFee(6);

      // Make Alice a member of the Fast.
      accessMock.isMember.reset();
      accessMock.isMember.whenCalledWith(alice.address).returns(true);

      // Try and add Alice twice.
      const subject = issuerDistribution.addBeneficiaries([alice.address, alice.address], [2, 1]);
      await expect(subject).to.have.been
        .revertedWith("Address already in set");
    });
  });

  describe("removeBeneficiaries", async () => {
    let distribution: MockContract<Distribution>,
      issuerDistribution: MockContract<Distribution>,
      governorDistribution: MockContract<Distribution>;

    const totalFunds = 10;

    beforeEach(async () => {
      // Stub out the ERC20 contract.
      erc20.balanceOf.reset();
      erc20.balanceOf.returns(10);
      erc20.transfer.reset();
      erc20.transfer.returns(true);

      // Deploy the Distribution contract.
      const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

      distribution = await factory.deploy({
        distributor: governor.address,
        issuer: issuer.address,
        fast: fast.address,
        token: erc20.address,
        total: totalFunds,
        blockLatch: 1
      });

      governorDistribution = distribution.connect(governor);
      issuerDistribution = distribution.connect(issuerMember);
    });

    it("requires that the phase is BeneficiariesSetup", async () => {
      // We haven't set the fee yet so this should revert.
      const subject = issuerDistribution.removeBeneficiaries([alice.address]);
      await expect(subject).to.have.been
        .revertedWith("UnsupportedOperation");
    });

    it("requires that the caller is a distribution manager", async () => {
      await issuerDistribution.setFee(2);

      const subject = governorDistribution.removeBeneficiaries([alice.address]);
      await expect(subject).to.have.been
        .revertedWith("RequiresIssuerMembership");
    });

    it("removes given beneficiaries and their owings", async () => {
      // Setup.
      await issuerDistribution.setFee(2);
      accessMock.isMember.reset();
      accessMock.isMember.whenCalledWith(alice.address).returns(true);

      // Add Alice as a beneficiary.
      await issuerDistribution.addBeneficiaries([alice.address], [1]);

      // Remove Alice.
      await issuerDistribution.removeBeneficiaries([alice.address]);

      const [beneficiaries] = await distribution.paginateBeneficiaries(0, 1);
      expect(beneficiaries).to.be.eql([]);
    });

    it("reclaims the unused funds as part of the available funds tracker", async () => {
      // Setup.
      const amount = 2;

      await issuerDistribution.setFee(2);
      accessMock.isMember.reset();
      accessMock.isMember.whenCalledWith(alice.address).returns(true);

      // Add Alice as a beneficiary.
      await issuerDistribution.addBeneficiaries([alice.address], [amount]);

      const availableBefore = (await distribution.available()).toNumber();

      // Remove Alice, increasing the available funds.
      await issuerDistribution.removeBeneficiaries([alice.address]);

      const availableAfter = (await distribution.available()).toNumber();

      expect(availableBefore).to.be.eq(availableAfter - amount);
    });

    it("reverts if a beneficiary cannot be removed because it is not present", async () => {
      await issuerDistribution.setFee(2);
      accessMock.isMember.reset();
      accessMock.isMember.whenCalledWith(alice.address).returns(true);

      // Remove Alice, this should raise an error.
      const subject = issuerDistribution.removeBeneficiaries([alice.address]);

      await expect(subject).to.have.been
        .revertedWith("Address does not exist in set");
    });

    it("emits as many BeneficiaryRemoved events as there are beneficiaries removed", async () => {
      await issuerDistribution.setFee(2);
      accessMock.isMember.reset();
      accessMock.isMember.whenCalledWith(alice.address).returns(true);

      // Add and remove Alice as a beneficiary.
      await issuerDistribution.addBeneficiaries([alice.address], [2]);
      const subject = issuerDistribution.removeBeneficiaries([alice.address]);

      await expect(subject).to.emit(distribution, "BeneficiaryRemoved");
    });
  });

  describe("paginateBeneficiaries", async () => {
    // I LOVE COPYING AND PASTING THIS ALL OVER THE PLACE... HINT HINT...
    let distribution: MockContract<Distribution>,
      issuerDistribution: MockContract<Distribution>,
      governorDistribution: MockContract<Distribution>;

    const totalFunds = 10;

    beforeEach(async () => {
      // Stub out the ERC20 contract.
      erc20.balanceOf.reset();
      erc20.balanceOf.returns(10);
      erc20.transfer.reset();
      erc20.transfer.returns(true);

      // Deploy the Distribution contract.
      const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

      distribution = await factory.deploy({
        distributor: governor.address,
        issuer: issuer.address,
        fast: fast.address,
        token: erc20.address,
        total: totalFunds,
        blockLatch: 1
      });

      governorDistribution = distribution.connect(governor);
      issuerDistribution = distribution.connect(issuerMember);
    });

    it("returns pages of beneficiaries", async () => {
      await issuerDistribution.setFee(2);
      accessMock.isMember.reset();
      accessMock.isMember.whenCalledWith(alice.address).returns(true);

      // Add Alice as a beneficiary.
      await issuerDistribution.addBeneficiaries([alice.address], [2]);

      const [beneficiaries] = await distribution.paginateBeneficiaries(0, 1);
      expect(beneficiaries).to.be.eql([alice.address]);
    });
  });

  describe("withdraw", async () => {
    let distribution: MockContract<Distribution>,
      issuerDistribution: MockContract<Distribution>,
      aliceDistribution: MockContract<Distribution>,
      bobDistribution: MockContract<Distribution>;

    const totalFunds = 10;

    beforeEach(async () => {
      // Stub out the ERC20 contract.
      erc20.balanceOf.reset();
      erc20.balanceOf.returns(10);
      erc20.transfer.reset();
      erc20.transfer.returns(true);

      // Deploy the Distribution contract.
      const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

      distribution = await factory.deploy({
        distributor: governor.address,
        issuer: issuer.address,
        fast: fast.address,
        token: erc20.address,
        total: totalFunds,
        blockLatch: 1
      });

      aliceDistribution = distribution.connect(alice);
      bobDistribution = distribution.connect(bob);
      issuerDistribution = distribution.connect(issuerMember);

      await issuerDistribution.setFee(2);
      accessMock.isMember.reset();
      accessMock.isMember.whenCalledWith(alice.address).returns(true);

      // Add Alice as a beneficiary.
      await issuerDistribution.addBeneficiaries([alice.address], [8]);

      // Advance to the Withdrawl phase.
      await issuerDistribution.advance();
    });

    it("requires that the caller is a known beneficiary", async () => {
      const subject = bobDistribution.withdraw(bob.address);
      await expect(subject).to.be
        .revertedWith("NonExistentEntry");
    });

    it("reverts if the withdrawal already has been made", async () => {
      aliceDistribution = distribution.connect(alice);
      // Withdraw once.
      await aliceDistribution.withdraw(alice.address);

      // Attempt to withdraw again.
      const subject = aliceDistribution.withdraw(alice.address);
      await expect(subject).to.be
        .revertedWith("DuplicateEntry");
    });

    it("can be called on behalf of someone by anyone else", async () => {
      // Bob is going to withdraw on behalf of Alice... to Alice.
      await bobDistribution.withdraw(alice.address);

      // The ERC20 should have it's transfer function called with Alice's address.
      expect(erc20.transfer).to.have.been
        .calledWith(alice.address, 8);
    });

    it("transfers the ERC20 token to the given beneficiary", async () => {
      // Alice attempts to withdraw.
      await aliceDistribution.withdraw(alice.address);

      // The ERC20 should have it's transfer function called with Alice's address.
      expect(erc20.transfer).to.have.been
        .calledWith(alice.address, 8);
    });

    it("emits a Withdrawal event", async () => {
      const subject = aliceDistribution.withdraw(alice.address);

      await expect(subject).to.emit(distribution, "Withdrawal");
    });
  });

  describe("terminate", async () => {
    // TODO: Fix this duplication please...
    let distribution: MockContract<Distribution>,
      issuerDistribution: MockContract<Distribution>,
      aliceDistribution: MockContract<Distribution>;

    const totalFunds = 10;

    beforeEach(async () => {
      // Stub out the ERC20 contract.
      erc20.balanceOf.reset();
      erc20.balanceOf.returns(10);
      erc20.transfer.reset();
      erc20.transfer.returns(true);

      // Deploy the Distribution contract.
      const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

      distribution = await factory.deploy({
        distributor: governor.address,
        issuer: issuer.address,
        fast: fast.address,
        token: erc20.address,
        total: totalFunds,
        blockLatch: 1
      });

      aliceDistribution = distribution.connect(alice);
      issuerDistribution = distribution.connect(issuerMember);

      await issuerDistribution.setFee(2);
      accessMock.isMember.reset();
      accessMock.isMember.whenCalledWith(alice.address).returns(true);
    });

    it("requires the caller to be a distribution manager", async () => {
      const subject = aliceDistribution.terminate();
      await expect(subject).to.be
        .revertedWith("RequiresIssuerMembership");
    });

    it("advances to the Terminated phase", async () => {
      await issuerDistribution.terminate();
      const subject = await distribution.phase();
      expect(subject).to.be.eq(DistributionPhase.Terminated);
    });

    it("transfers all unclaimed ERC20 funds back to the distributor", async () => {
      await issuerDistribution.terminate();

      // The ERC20 should have it's transfer function called with the Issuer's address.
      expect(erc20.transfer).to.have.been
        .calledOnceWith(governor.address, 10);
    });

    it("sets the available funds to zero", async () => {
      await issuerDistribution.terminate();

      const subject = await distribution.available();
      expect(subject).to.be.eq(0);
    });
  });

  describe("various synthesized getters", async () => {
    let distribution: MockContract<Distribution>;

    beforeEach(async () => {
      // Stub out the ERC20 contract.
      erc20.balanceOf.reset();
      erc20.balanceOf.returns(10);
      erc20.transfer.reset();
      erc20.transfer.returns(true);

      // Deploy the Distribution contract.
      const factory = await smock.mock<Distribution__factory>("Distribution", deployer);

      distribution = await factory.deploy({
        distributor: governor.address,
        issuer: issuer.address,
        fast: fast.address,
        token: erc20.address,
        total: 10,
        blockLatch: 1
      });
    });

    it("exposes VERSION", async () => {
      expect(await distribution.VERSION()).to.be.eq(1);
    });

    it("exposes initial params", async () => {
      const originalParams = await distribution.params();
      const params = abiStructToObj(originalParams) as Distribution.ParamsStruct;

      expect(params).to.eql({
        distributor: governor.address,
        issuer: issuer.address,
        fast: fast.address,
        token: erc20.address,
        total: BigNumber.from(10),
        blockLatch: BigNumber.from(1)
      });
    });

    it("exposes phase", async () => {
      const subject = await distribution.phase();
      expect(subject).to.be.eq(DistributionPhase.FeeSetup);
    });

    it("exposes creationBlock", async () => {
      const latestBlockNumber = (await ethers.provider.getBlock("latest")).number;

      const subject = await distribution.creationBlock()
      expect(subject).to.be.eq(latestBlockNumber);
    });

    it("exposes fee", async () => {
      const subject = await distribution.fee();
      expect(subject).to.be.eq(0);
    });

    it("exposes available", async () => {
      const subject = await distribution.available()
      expect(subject).to.be.eq(10);
    });
  });
});
