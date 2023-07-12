import * as chai from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { MarketplaceFastDeploymentRequests } from "../../typechain";
import { marketplaceFixtureFunc } from "../fixtures/marketplace";
import {
  Issuer,
  Marketplace,
} from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
chai.use(solidity);
chai.use(smock.matchers);

describe("MarketplaceFastDeploymentRequestsFacet", () => {
  let deployer: SignerWithAddress, alice: SignerWithAddress;
  let issuer: FakeContract<Issuer>,
    marketplace: Marketplace,
    deploymentRequests: MarketplaceFastDeploymentRequests;

  const marketplaceDeployFixture = deployments.createFixture(
    marketplaceFixtureFunc
  );

  before(async () => {
    // Keep track of a few signers.
    [deployer, , alice] = await ethers.getSigners();
    // Mock an Issuer and FAST contract.
    issuer = await smock.fake("Issuer");
  });

  beforeEach(async () => {
    await marketplaceDeployFixture({
      opts: {
        name: "MarketplaceFastDeploymentRequestsFixture",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ marketplace } = args);
          deploymentRequests =
            await ethers.getContractAt<MarketplaceFastDeploymentRequests>(
              "MarketplaceFastDeploymentRequestsFacet",
              marketplace.address
            );
        },
      },
      initWith: {
        issuer: issuer.address,
      },
    });
  });

  describe("fastDeploymentRequestPrice", () => {
    it("returns the price for a FAST deployment request");
  });

  describe("setFastDeploymentRequestPrice", () => {
    it("requires the caller to be an Issuer member");
    it("sets the price for a FAST deployment request");
  });

  describe("fastDeploymentRequestsCount", () => {
    it("returns the number of FAST deployment requests");
  });

  describe("fastDeploymentRequest", () => {
    it("reverts when the index is out of bounds");
    it("returns the FAST deployment request at the given index");
  });

  describe("requestDeployment", () => {
    it("requires that the caller is a Marketplace member member");
    it("requires the attached value to be equal to the defined price (less)");
    it("requires the attached value to be equal to the defined price (more)");
    it("emits a FastDeploymentRequested event");
    it("adds the request to the list of requests");
  });
});
