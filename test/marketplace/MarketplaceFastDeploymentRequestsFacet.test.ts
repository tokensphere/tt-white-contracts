import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { MarketplaceFastDeploymentRequestsFacet } from "../../typechain";
import { marketplaceFixtureFunc } from "../fixtures/marketplace";
import {
  Issuer,
  Marketplace,
} from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
import { abiStructToObj } from "../utils";
chai.use(solidity);
chai.use(smock.matchers);

describe.only("MarketplaceFastDeploymentRequestsFacet", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress;
  let issuer: FakeContract<Issuer>,
    marketplace: Marketplace,
    deploymentRequests: MarketplaceFastDeploymentRequestsFacet;

  const validParams = '{"foo": "bar"}';

  const marketplaceDeployFixture = deployments.createFixture(
    marketplaceFixtureFunc
  );

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, alice, bob] = await ethers.getSigners();
    // Mock an Issuer contract.
    issuer = await smock.fake("Issuer");

    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);
  });

  beforeEach(async () => {
    await marketplaceDeployFixture({
      opts: {
        name: "MarketplaceFastDeploymentRequestsFixture",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ marketplace } = args);
          deploymentRequests =
            await ethers.getContractAt<MarketplaceFastDeploymentRequestsFacet>(
              "MarketplaceFastDeploymentRequestsFacet",
              marketplace.address
            );

          // Make Alice a Marketplace member.
          await marketplace.connect(issuerMember).addMember(alice.address);
          // Set the price for a FAST deployment request.
          await deploymentRequests
            .connect(issuerMember)
            .setFastDeploymentRequestPrice(ethers.utils.parseEther("5"));
        },
      },
      initWith: {
        issuer: issuer.address,
      },
    });
  });

  describe("fastDeploymentRequestPrice", () => {
    it("returns the price for a FAST deployment request", async () => {
      const subject = await deploymentRequests.fastDeploymentRequestPrice();
      expect(subject).to.eq(ethers.utils.parseEther("5"));
    });
  });

  describe("setFastDeploymentRequestPrice", () => {
    it("requires the caller to be an Issuer member", async () => {
      const subject = deploymentRequests
        .connect(alice)
        .setFastDeploymentRequestPrice(ethers.utils.parseEther("5"));
      expect(subject).to.be.revertedWith("RequiresIssuerMembership");
    });

    it("sets the price for a FAST deployment request", async () => {
      await deploymentRequests
        .connect(issuerMember)
        .setFastDeploymentRequestPrice(ethers.utils.parseEther("10"));
      const subject = await deploymentRequests.fastDeploymentRequestPrice();
      expect(subject).to.eq(ethers.utils.parseEther("10"));
    });
  });

  describe("fastDeploymentRequestsCount", () => {
    beforeEach(async () => {
      await deploymentRequests.connect(alice).requestDeployment(validParams, {
        value: ethers.utils.parseEther("5"),
      });
    });

    it("returns the number of FAST deployment requests", async () => {
      const subject = await deploymentRequests.fastDeploymentRequestsCount();
      expect(subject).to.eq(1);
    });
  });

  describe("fastDeploymentRequest", () => {
    beforeEach(async () => {
      await deploymentRequests.connect(alice).requestDeployment(validParams, {
        value: ethers.utils.parseEther("5"),
      });
    });

    it("reverts when the index is out of bounds", async () => {
      const subject = deploymentRequests.fastDeploymentRequest(1);
      expect(subject).to.be.revertedWith("OutOfBounds");
    });

    it("returns the FAST deployment request at the given index", async () => {
      const subject = abiStructToObj(
        await deploymentRequests.fastDeploymentRequest(0)
      );

      expect(subject).to.eql({
        sender: alice.address,
        paid: ethers.utils.parseEther("5"),
        params: validParams,
      });
    });
  });

  describe("requestDeployment", () => {
    it("requires that the caller is a Marketplace member", async () => {
      const subject = deploymentRequests
        .connect(bob)
        .requestDeployment(validParams, {
          value: ethers.utils.parseEther("5"),
        });
      await expect(subject).to.be.revertedWith("RequiresMarketplaceMembership");
    });

    it("requires the attached value to be equal to the defined price (less)", async () => {
      const subject = deploymentRequests
        .connect(alice)
        .requestDeployment(validParams, {
          value: ethers.utils.parseEther("4"),
        });
      await expect(subject).to.be.revertedWith("InsufficientFunds");
    });

    it("requires the attached value to be equal to the defined price (more)", async () => {
      const subject = deploymentRequests
        .connect(alice)
        .requestDeployment(validParams, {
          value: ethers.utils.parseEther("6"),
        });
      await expect(subject).to.be.revertedWith("Overfunded");
    });

    it("emits a FastDeploymentRequested event", async () => {
      const subject = deploymentRequests
        .connect(alice)
        .requestDeployment(validParams, {
          value: ethers.utils.parseEther("5"),
        });
      await expect(subject)
        .to.emit(deploymentRequests, "FastDeploymentRequested")
        .withArgs(0);
    });

    it("adds the request to the list of requests", async () => {
      await deploymentRequests.connect(alice).requestDeployment(validParams, {
        value: ethers.utils.parseEther("5"),
      });
      const subject = abiStructToObj(
        await deploymentRequests.fastDeploymentRequest(0)
      );
      expect(subject).to.eql({
        sender: alice.address,
        paid: ethers.utils.parseEther("5"),
        params: validParams,
      });
    });
  });
});
