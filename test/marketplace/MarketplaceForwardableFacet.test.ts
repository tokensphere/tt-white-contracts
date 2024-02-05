import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { MarketplaceForwardableFacet } from "../../typechain";
import { marketplaceFixtureFunc } from "../fixtures/marketplace";
import {
  Fast,
  Issuer,
  Marketplace,
} from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
import { IForwarder } from "../../typechain";
chai.use(solidity);
chai.use(smock.matchers);

describe("MarketplaceForwardableFacet", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress;

  let issuer: FakeContract<Issuer>,
    marketplace: Marketplace,
    forwarder: FakeContract<IForwarder>,
    forwardable: MarketplaceForwardableFacet,
    issuerMemberForwardable: MarketplaceForwardableFacet;

  const marketplaceDeployFixture = deployments.createFixture(
    marketplaceFixtureFunc
  );

  const resetIssuerMock = () => {
    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);
  };

  // Fix the forwarder to support the IForwarder interface.
  const resetIFowarderMock = () => {
    forwarder.supportsInterface.reset();
    forwarder.supportsInterface.whenCalledWith(/* IForwarder */ "0x25e23e64").returns(true);
    forwarder.supportsInterface.returns(false);
  }

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember] = await ethers.getSigners();
    // Mock Issuer and IForwarder contracts.
    issuer = await smock.fake("Issuer");
    forwarder = await smock.fake("IForwarder");
  });

  beforeEach(async () => {
    await marketplaceDeployFixture({
      opts: {
        name: "MarketplaceForwardableFixture",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ marketplace } = args);
          forwardable = await ethers.getContractAt<MarketplaceForwardableFacet>(
            "MarketplaceForwardableFacet",
            marketplace.address
          );
          issuerMemberForwardable = forwardable.connect(issuerMember);
        },
      },
      initWith: {
        issuer: issuer.address,
      },
    });

    resetIssuerMock();
    resetIFowarderMock();
  });

  describe("isTrustedForwarder", () => {
    it("returns true if the passed address is a trusted forwarder", async () => {
      // Set the trusted forwarder.
      await issuerMemberForwardable.setTrustedForwarder(forwarder.address);

      const subject = await forwardable.isTrustedForwarder(forwarder.address);
      expect(subject).to.be.true;
    });
  });

  describe("setTrustedForwarder", () => {
    it("sets the trusted forwarder", async () => {
      await issuerMemberForwardable.setTrustedForwarder(forwarder.address);

      const subject = await forwardable.getTrustedForwarder();
      expect(subject).to.eq(forwarder.address);
    });
  });

  describe("getTrustedForwarder", () => {
    it("returns the trusted forwarder", async () => {
      await issuerMemberForwardable.setTrustedForwarder(forwarder.address);

      const subject = await forwardable.getTrustedForwarder();
      expect(subject).to.eq(forwarder.address);
    });
  });
});
