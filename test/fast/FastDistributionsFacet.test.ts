import * as chai from "chai";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { solidity } from "ethereum-waffle";
import { FakeContract, MockContract, smock } from "@defi-wonderland/smock";
import { deployments, ethers } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { Issuer, FastDistributionsFacet, Marketplace, Fast, FastAccessFacet, IERC20, Distribution } from "../../typechain";
import { fastFixtureFunc } from "../fixtures/fast";
import { abiStructToObj, DistributionPhase } from "../utils";
chai.use(solidity);
chai.use(smock.matchers);

describe("FastDistributionsFacet", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress,
    alice: SignerWithAddress;

  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    fast: Fast,
    accessMock: MockContract<FastAccessFacet>,
    erc20: FakeContract<IERC20>,
    distributions: FastDistributionsFacet,
    governorDistributions: FastDistributionsFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  // Setup for a successful distribution.
  const setupSuccessfulDistribution = async () => {
    // Setup a fake ERC20 token.
    erc20.allowance.reset();
    erc20.allowance.returns(100);
    erc20.balanceOf.reset();
    erc20.balanceOf.returns(100);
    erc20.transferFrom.reset();
    erc20.transferFrom.returns(true);

    // Add the governor as a member of the FAST.
    accessMock.isMember.reset();
    accessMock.isMember.whenCalledWith(governor.address).returns(true);
    accessMock.isMember.returns(false);
  };

  // Helper function to grab the first distribution.
  const getFirstDeployedDistribution = async (fast: Fast): Promise<Distribution> => {
    const [[distAddr]] = await fast.paginateDistributions(0, 1);
    return await ethers.getContractAt<Distribution>("Distribution", distAddr);
  };

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, alice] = await ethers.getSigners();
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");
    marketplace.issuerAddress.returns(issuer.address);

    // TODO: Totally forgotten about what I'm doing... I just want a generic ERC20.
    erc20 = await smock.fake("IERC20");
  });

  beforeEach(async () => {
    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);

    marketplace.isMember.reset();
    for (const address in [governor, alice]) {
      marketplace.isMember.whenCalledWith(address).returns(true);
      marketplace.isActiveMember.whenCalledWith(address).returns(true);
    }
    marketplace.isMember.returns(false);
    marketplace.isActiveMember.returns(false);

    await fastDeployFixture({
      opts: {
        name: "FastDistributionsFacet",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ fast, accessMock } = args);
          distributions = await ethers.getContractAt<FastDistributionsFacet>("FastDistributionsFacet", fast.address);
          governorDistributions = distributions.connect(governor);
        },
      },
      initWith: {
        issuer: issuer.address,
        marketplace: marketplace.address,
        governor: governor.address,
      },
    });
  });

  describe("createDistribution", async () => {
    const total = 100,
      blockLatch = 0;

    it("requires FAST membership", async () => {
      const subject = distributions.createDistribution(erc20.address, total, blockLatch);
      await expect(subject).to.be
        .revertedWith("RequiresFastMembership");
    });

    it("checks for the ERC20 allowance to cover the distribution total", async () => {
      // Give insufficient allowance.
      erc20.allowance.reset();
      erc20.allowance.returns(99);

      accessMock.isMember.whenCalledWith(governor.address).returns(true);

      const subject = governorDistributions.createDistribution(erc20.address, total, blockLatch);
      // TODO: Parameterized error message?
      // This should be `InsufficientFund(10)` for example.
      await expect(subject).to.be.revertedWith("InsufficientFunds");
    });

    it("deploys a new distribution with the correct parameters", async () => {
      setupSuccessfulDistribution();

      // Create the distribution.
      await governorDistributions.createDistribution(erc20.address, total, blockLatch);

      // Get the first deployed distribution, get it's deployment params.
      const originalParams = await (await getFirstDeployedDistribution(fast)).params();

      // Generic version of this?
      const params = abiStructToObj(originalParams) as Distribution.ParamsStruct;

      expect(params).to.eql({
        distributor: governor.address,
        issuer: issuer.address,
        fast: fast.address,
        token: erc20.address,
        blockLatch: BigNumber.from(1),
        total: BigNumber.from(100)
      })
    });

    it("keeps track of the newly deployed distribution", async () => {
      setupSuccessfulDistribution();

      // Create the distribution and check the tracked distributions.
      // TODO: We probably want to check this a different way, otherwise they're be test overlap.
      await governorDistributions.createDistribution(erc20.address, total, blockLatch);
      const [values] = await governorDistributions.paginateDistributions(0, 1);
      expect(values.length).to.be.eq(1);
    });

    it("uses the allowance to transfer from the distributor to the newly deployed distribution", async () => {
      setupSuccessfulDistribution();

      // Create the distribution.
      await governorDistributions.createDistribution(erc20.address, total, blockLatch);

      // Get the first deployed distribution, check it's Phase.
      const dist = await getFirstDeployedDistribution(fast);

      // Check balance of the distribution.
      expect(await dist.available()).to.eq(BigNumber.from(100));

      // TODO: Check the erc20 has been debited?
    });

    it("leaves the distribution in the FeeSetup phase when done", async () => {
      setupSuccessfulDistribution();

      // Create the distribution.
      await governorDistributions.createDistribution(erc20.address, total, blockLatch);

      // Get the first deployed distribution, check it's Phase.
      const dist = await getFirstDeployedDistribution(fast);

      expect(await dist.phase()).to.eq(DistributionPhase.FeeSetup);
    });

    it("emits a DistributionDeployed event", async () => {
      setupSuccessfulDistribution();

      const subject = governorDistributions.createDistribution(erc20.address, total, blockLatch);
      // TODO: Add withArgs().
      await expect(subject).to.emit(fast, "DistributionDeployed");
    });
  });

  describe("distributionCount", async () => {
    let token: string,
      total: number,
      blockLatch: string;

    beforeEach(async () => {
      // Probably a nicer way to handle this.
      token = erc20.address;
      total = 100;
      blockLatch = "0x1";
    });

    it("returns the number of deployed distributions", async () => {
      setupSuccessfulDistribution();

      await governorDistributions.createDistribution(token, total, blockLatch);

      const subject = await governorDistributions.distributionCount();
      expect(subject).to.eq(1);
    });
  });

  describe("paginateDistributions", async () => {
    let token: string,
      total: number,
      blockLatch: string;

    beforeEach(async () => {
      // Probably a nicer way to handle this.
      token = erc20.address;
      total = 100;
      blockLatch = "0x1";
    });

    it("returns pages of deployed distributions", async () => {
      setupSuccessfulDistribution();

      await governorDistributions.createDistribution(token, total, blockLatch);

      const [[distributionAddress], nextCursor] = await governorDistributions.paginateDistributions(0, 1);

      expect(distributionAddress).to.be.properAddress;
      expect(nextCursor).to.eq(1);
    });
  });
});
