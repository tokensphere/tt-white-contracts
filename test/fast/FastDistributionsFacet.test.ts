import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { deployments, ethers } from "hardhat";
import { FakeContract, MockContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { Issuer, Marketplace, FastDistributionsFacet, IERC20, FastAccessFacet } from "../../typechain";
import { fastFixtureFunc } from "../fixtures/fast";

chai.use(solidity);
chai.use(smock.matchers);

describe("FastDistributionsFacet", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress,
    member: SignerWithAddress,
    bob: SignerWithAddress;
  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    erc20: FakeContract<IERC20>,
    access: MockContract<FastAccessFacet>,
    distributions: FastDistributionsFacet,
    distributionsAsMember: FastDistributionsFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, member, bob] = await ethers.getSigners();
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");
    erc20 = await smock.fake("IERC20");
    // Stub isMember, issuerAddress calls.
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);
    marketplace.issuerAddress.returns(issuer.address);
    marketplace.isMember.whenCalledWith(member.address).returns(true);
    marketplace.isMember.whenCalledWith(governor.address).returns(true);
    marketplace.isMember.returns(false);
    marketplace.isActiveMember.whenCalledWith(member.address).returns(true);
    marketplace.isActiveMember.whenCalledWith(governor.address).returns(true);
    marketplace.isActiveMember.returns(false);
  });

  beforeEach(async () => {
    await fastDeployFixture({
      opts: {
        name: "FastDistributionsFacetFixture",
        deployer: deployer.address,
        afterDeploy: async ({ fast, accessMock }) => {
          access = accessMock;
          await access.connect(governor).addMember(member.address);

          distributions = await ethers.getContractAt<FastDistributionsFacet>("FastDistributionsFacet", fast.address);
          distributionsAsMember = distributions.connect(member);
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
    beforeEach(async () => {
      erc20.allowance.reset();
      erc20.allowance.returns(100);
    });

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

    });

    it("keeps track of the deployed distribution", async () => { });

    it("transfers the ERC20 tokens to the deployed distribution", async () => { });

    it("advances the distribution to the FeeSetup phase", async () => { });

    it("emits a DistributionDeployed event", async () => { });
  });

  describe("distributionCount", async () => {
    it("counts all deployed distributions");
  });

  describe("paginateDistributions", async () => {
    it("returns pages of deployed distributions");
  });
});
