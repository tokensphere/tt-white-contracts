import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { marketplaceFixtureFunc } from "../fixtures/marketplace";
import {
  Issuer,
  Marketplace,
} from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
chai.use(solidity);
chai.use(smock.matchers);

describe("MarketplaceTopFacet", () => {
  let deployer: SignerWithAddress, issuerMember: SignerWithAddress;
  let issuer: FakeContract<Issuer>, marketplace: Marketplace;

  const marketplaceDeployFixture = deployments.createFixture(
    marketplaceFixtureFunc
  );

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember] = await ethers.getSigners();
    // Mock an Issuer contract.
    issuer = await smock.fake("Issuer");
  });

  beforeEach(async () => {
    await marketplaceDeployFixture({
      opts: {
        name: "MarketplaceTopFixture",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ marketplace } = args);
        },
      },
      initWith: {
        issuer: issuer.address,
      },
    });

    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);
  });

  describe("issuerAddress", () => {
    it("returns the Issuer address", async () => {
      const subject = await marketplace.issuerAddress();
      expect(subject).to.eq(issuer.address);
    });
  });

  describe("withdrawEth", () => {
    beforeEach(async () => {
      await ethers.provider.send("hardhat_setBalance", [
        marketplace.address,
        "0x11",
      ]);
    });

    it("requires the caller to be an issuer member", async () => {
      const subject = marketplace.withdrawEth(0x10);
      await expect(subject).to.be.revertedWith("RequiresIssuerMembership");
    });

    it("withdraws the specified amount of eth", async () => {
      const subject = await marketplace.connect(issuerMember).withdrawEth(0x10);
      expect(subject).to.changeEtherBalances(
        [marketplace, issuerMember],
        [-0x10, 0x10]
      );
    });
  });
});
