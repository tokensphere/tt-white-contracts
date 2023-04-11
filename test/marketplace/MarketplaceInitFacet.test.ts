import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { Issuer, MarketplaceTopFacet, Marketplace, MarketplaceInitFacet } from "../../typechain";
import { marketplaceFixtureFunc } from "../fixtures/marketplace";
import { BigNumber } from "ethers";
import { impersonateContract } from "../utils";
import { DEPLOYER_FACTORY_COMMON } from "../../src/utils";
chai.use(solidity);
chai.use(smock.matchers);

describe("MarketplaceInitFacet", () => {
  let deployer: SignerWithAddress;
  let issuer: FakeContract<Issuer>, marketplace: Marketplace, top: MarketplaceTopFacet;

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
        name: "MarketplaceInitFixture",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ marketplace } = args);
          top = await ethers.getContractAt<MarketplaceTopFacet>("MarketplaceTopFacet", marketplace.address);
        },
      },
      initWith: {
        issuer: issuer.address,
      },
    });
  });

  describe("initialize", async () => {
    it("requires that it is not initialized", async () => {
      // Attempt to re-initialize.
      const marketplaceInit = await ethers.getContractAt<MarketplaceInitFacet>(
        "MarketplaceInitFacet",
        marketplace.address,
      );
      const marketplaceInitAsItself = await impersonateContract(marketplaceInit, DEPLOYER_FACTORY_COMMON.factory);
      const subject = marketplaceInitAsItself.initialize({
        issuer: issuer.address,
      });

      await expect(subject).to.be.revertedWith("AlreadyInitialized");
    });

    it("set various storage versions", async () => {
      // Query the slot and parse out the STORAGE_VERSION.
      const slot = ethers.utils.solidityKeccak256(["string"], ["Marketplace.storage"]);
      const data = await ethers.provider.send("eth_getStorageAt", [marketplace.address, slot, "latest"]);
      // Slice out the final 2 bytes to get the version.
      const subject = ethers.utils.hexDataSlice(data, 30, 32);

      // Expectations.
      expect(BigNumber.from(subject).toString()).to.eq("1");
    });

    it("registers supported interfaces", async () => {
      expect({
        IERC165: await marketplace.supportsInterface("0x01ffc9a7"),
        IERC173: await marketplace.supportsInterface("0x7f5828d0"),
        IDiamondCut: await marketplace.supportsInterface("0x1f931c1c"),
        IDiamondLoupe: await marketplace.supportsInterface("0x48e2b093"),
        AHasMembers: await marketplace.supportsInterface("0xb4bb4f46"),
        AHasAutomatons: await marketplace.supportsInterface("0x7b763e88")
      }).to.be.eql({
        IERC165: true,
        IERC173: true,
        IDiamondCut: true,
        IDiamondLoupe: true,
        AHasMembers: true,
        AHasAutomatons: true,
      });
    });

    it("stores the given Issuer address", async () => {
      // Querying the Issuer address via the MarketplaceTopFacet should return the stored address.
      const subject = await top.issuerAddress();
      expect(subject).to.be.eq(issuer.address);
    });
  });
});
