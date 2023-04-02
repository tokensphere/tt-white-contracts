import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { Issuer, Marketplace } from "../../typechain";
import { marketplaceFixtureFunc } from "../fixtures/marketplace";
chai.use(solidity);
chai.use(smock.matchers);

describe("MarketplaceTopFacet", () => {
  let deployer: SignerWithAddress;
  let issuer: FakeContract<Issuer>, marketplace: Marketplace;

  const marketplaceDeployFixture = deployments.createFixture(marketplaceFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer] = await ethers.getSigners();
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
  });

  describe("issuerAddress", async () => {
    it("returns the Issuer address", async () => {
      const subject = await marketplace.issuerAddress();
      expect(subject).to.eq(issuer.address);
    });
  });
});
