import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { Issuer, Marketplace, FastAccessFacet, FastCrowdfundsFacet, IERC20, Crowdfund } from "../../typechain";
import { fastFixtureFunc } from "../fixtures/fast";
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
    crowdfunds: FastCrowdfundsFacet,
    crowdfundsAsMember: FastCrowdfundsFacet;

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
        name: "FastCrowdfundsFixture",
        deployer: deployer.address,
        afterDeploy: async ({ fast }) => {
          crowdfunds = await ethers.getContractAt<FastCrowdfundsFacet>("FastCrowdfundsFacet", fast.address);
          crowdfundsAsMember = crowdfunds.connect(alice);
          const access = await ethers.getContractAt<FastAccessFacet>("FastAccessFacet", fast.address);
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

  describe("createCrowdfund", async () => {
    it("requires the caller to be a FAST member");
    it("deploys a new crowdfund with the given parameters");
    describe("deploys a crowdfund and", async () => {
      it("keeps track of the deployed crowdfund");
      it("emits a CrowdfundDeployed event");
    });
  });

  describe("crowdfundCount", async () => {
    it("counts all deployed crowdfunds");
  });

  describe("paginateCrowdfunds", async () => {
    it("returns pages of deployed crowdfunds");
  });
});
