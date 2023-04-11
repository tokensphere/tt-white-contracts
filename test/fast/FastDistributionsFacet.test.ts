import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, MockContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { Issuer, Marketplace, FastAccessFacet, FastTokenFacet, FastFrontendFacet, Fast, FastDistributionsFacet, IERC20, Distribution } from "../../typechain";
import { fastFixtureFunc } from "../fixtures/fast";
import { DistributionPhase } from "../utils";
chai.use(solidity);
chai.use(smock.matchers);

describe("FastDistributionsFacet", () => {
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
    access: FastAccessFacet,
    distributions: FastDistributionsFacet,
    distributionsAsMember: FastDistributionsFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, alice, bob, rob, john] = await ethers.getSigners();
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");
    erc20 = await smock.fake("IERC20");
    marketplace.issuerAddress.returns(issuer.address);
  });

  beforeEach(async () => {
    // Issuer is a member of the issuer contract.
    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);

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

    await ethers.provider.send("hardhat_setBalance", [alice.address, '0xffffffffffffffffffff']);

    await fastDeployFixture({
      opts: {
        name: "FastDistributionsFixture",
        deployer: deployer.address,
        afterDeploy: async ({ fast }) => {
          distributions = await ethers.getContractAt<FastDistributionsFacet>("FastDistributionsFacet", fast.address);
          distributionsAsMember = distributions.connect(alice);

          access = await ethers.getContractAt<FastAccessFacet>("FastAccessFacet", fast.address);
          await access.connect(governor).addMember(alice.address);
        },
      },
      initWith: {
        issuer: issuer.address,
        marketplace: marketplace.address,
        governor: governor.address,
      },
    });
  });

  /// Governorship related stuff.

  describe("createDistribution", async () => {
    it("requires the caller to be a FAST member", async () => {
      const subject = distributions.createDistribution(erc20.address, 100, 0);
      await expect(subject).to.have
        .revertedWith("RequiresFastMembership");
    });

    it("reverts if the allowance of the ERC20 token is not enough", async () => {
      const subject = distributionsAsMember.createDistribution(erc20.address, 101, 0);
      await expect(subject).to.have
        .revertedWith("InsufficientFunds");
    });

    it("deploys a new distribution with the given parameters", async () => {
      await distributionsAsMember.createDistribution(erc20.address, 100, 0);
      const [page] = await distributions.paginateDistributions(0, 10);
      expect(page.length).to.eq(1);
    });

    describe("deploys a distribution and", async () => {
      let
        tx: any,
        distAddr: string,
        dist: Distribution;

      beforeEach(async () => {
        await (tx = distributionsAsMember.createDistribution(erc20.address, 100, 0));
        const [dists] = await distributions.paginateDistributions(0, 1);
        distAddr = dists[0];
        dist = await ethers.getContractAt("Distribution", distAddr);
      });

      it("keeps track of the deployed distribution", async () => {
        await Promise.all([1, 2].map(() => distributionsAsMember.createDistribution(erc20.address, 100, 0)));
        const [page] = await distributions.paginateDistributions(0, 10);
        expect(page.length).to.eq(3);
      });

      it("call the ERC20.transferFrom with the correct arguments", async () => {
        expect(erc20.transferFrom).to.have.been
          .calledOnceWith(alice.address, distAddr, 100);
      });

      it("advances the distribution to the FeeSetup phase", async () => {
        const subject = await dist.phase();
        expect(subject).to.eq(DistributionPhase.FeeSetup);
      });

      it("emits a DistributionDeployed event", async () => {
        await expect(tx).to
          .emit(distributions, "DistributionDeployed")
          .withArgs(distAddr);
      });
    });
  });

  describe("distributionCount", async () => {
    beforeEach(async () => {
      await Promise.all([1, 2, 3, 4, 5].map(() => distributionsAsMember.createDistribution(erc20.address, 100, 0)));
    });

    it("counts all deployed distributions", async () => {
      const subject = await distributions.distributionCount();
      expect(subject).to.eq(5);
    });
  });

  describe("paginateDistributions", async () => {
    it("returns pages of deployed distributions");
  });
});
