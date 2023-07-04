import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { Issuer, Marketplace, Fast, FastInitFacet } from "../../typechain";
import { fastFixtureFunc, FAST_INIT_DEFAULTS } from "../fixtures/fast";
import { FAST_FACETS } from "../../tasks/fast";
import {
  DEPLOYER_FACTORY_COMMON,
  deploymentSalt,
  ZERO_ADDRESS,
} from "../../src/utils";
import { BigNumber, Signer } from "ethers";
import { impersonateContract, stopImpersonating } from "../utils";
chai.use(solidity);
chai.use(smock.matchers);

const numberToBytes32 = (bn: BigNumber) =>
  ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));

// TODO: FOR SOME REASON, THIS TEST MAKES WHICHEVER OTHER TEST FILE THAT RUNS AFTER IT FAIL.
describe("FastInitFacet", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress;
  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    fast: Fast,
    initFacet: FastInitFacet,
    initFacetAsDeployer: FastInitFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor] = await ethers.getSigners();
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");
  });

  beforeEach(async () => {
    // Set the Issuer mock.
    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);

    // Set up marketplace mock.
    marketplace.issuerAddress.returns(issuer.address);
    marketplace.isMember.reset();
    marketplace.isMember.whenCalledWith(governor.address).returns(true);
    marketplace.isMember.returns(false);
    marketplace.isActiveMember.reset();
    marketplace.isActiveMember.whenCalledWith(governor.address).returns(true);
    marketplace.isActiveMember.returns(false);
  });

  beforeEach(async () => {
    await fastDeployFixture({
      opts: {
        name: "FastInitFixture",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ fast } = args);
          await fast.connect(issuerMember).addGovernor(governor.address);
          // Add the init facet back to the diamond.
          await deployments.diamond.deploy("FastInitFixture", {
            from: deployer.address,
            facets: FAST_FACETS,
          });
          initFacet = await ethers.getContractAt<FastInitFacet>(
            "FastInitFacet",
            fast.address
          );
        },
      },
      initWith: {
        issuer: issuer.address,
        marketplace: marketplace.address,
      },
    });
  });

  // Getters.

  describe("initialize", () => {
    let factorySigner: SignerWithAddress;
    beforeEach(async () => {
      // Get the factory signer so that we can act on its behalf.
      factorySigner = await ethers.getSigner(DEPLOYER_FACTORY_COMMON.factory);
      initFacetAsDeployer = await impersonateContract(
        initFacet,
        factorySigner.address
      );
    });
    afterEach(async () => await stopImpersonating(factorySigner.address));

    it("reverts when already initialized", async () => {
      const subject = initFacetAsDeployer.initialize({
        ...FAST_INIT_DEFAULTS,
        issuer: ZERO_ADDRESS,
        marketplace: ZERO_ADDRESS,
      });
      await expect(subject).to.have.revertedWith("AlreadyInitialized");
    });

    it("reverts if the default crowdfunds basis points fee is invalid");

    // it("sets LibFast storage version", async () => {
    //   const slot = ethers.utils.solidityKeccak256(["string"], ["Fast.storage"]);
    //   const data = await ethers.provider.send("eth_getStorageAt", [
    //     fast.address,
    //     slot,
    //   ]);
    //   const subject = ethers.utils.hexDataSlice(data, 30, 32);
    //   expect(BigNumber.from(subject)).to.eq(1);
    // });

    // it("sets LibFastToken storage version", async () => {
    //   const slot = ethers.utils.solidityKeccak256(
    //     ["string"],
    //     ["Fast.storage.Token"]
    //   );
    //   const subject = await ethers.provider.send("eth_getStorageAt", [
    //     fast.address,
    //     slot,
    //   ]);
    //   expect(BigNumber.from(subject)).to.eq(1);
    // });

    // it("sets LibFastHistory storage version", async () => {
    //   const slot = ethers.utils.solidityKeccak256(
    //     ["string"],
    //     ["Fast.storage.History"]
    //   );
    //   const subject = await ethers.provider.send("eth_getStorageAt", [
    //     fast.address,
    //     slot,
    //   ]);
    //   expect(BigNumber.from(subject)).to.eq(1);
    // });

    // it("sets LibFastDistributions storage version", async () => {
    //   const slot = ethers.utils.solidityKeccak256(
    //     ["string"],
    //     ["Fast.storage.Distributions"]
    //   );
    //   const subject = await ethers.provider.send("eth_getStorageAt", [
    //     fast.address,
    //     slot,
    //   ]);
    //   expect(BigNumber.from(subject)).to.eq(1);
    // });

    // it("sets LibFastCrowdfunds storage version", async () => {
    //   const slot = ethers.utils.solidityKeccak256(
    //     ["string"],
    //     ["Fast.storage.Crowdfunds"]
    //   );
    //   const subject = await ethers.provider.send("eth_getStorageAt", [
    //     fast.address,
    //     slot,
    //   ]);
    //   expect(BigNumber.from(subject)).to.eq(2);
    // });

    // it("sets LibHasGovernors storage version", async () => {
    //   const slot = ethers.utils.solidityKeccak256(
    //     ["string"],
    //     ["HasGovernors.storage.Main"]
    //   );
    //   const subject = await ethers.provider.send("eth_getStorageAt", [
    //     fast.address,
    //     slot,
    //   ]);
    //   expect(BigNumber.from(subject)).to.eq(1);
    // });

    // it("sets LibHasMembers storage version", async () => {
    //   const slot = ethers.utils.solidityKeccak256(
    //     ["string"],
    //     ["HasMembers.storage.Main"]
    //   );
    //   const subject = await ethers.provider.send("eth_getStorageAt", [
    //     fast.address,
    //     slot,
    //   ]);
    //   expect(BigNumber.from(subject)).to.eq(1);
    // });

    // it("registers supported interfaces", async () => {
    //   // TODO: We could test for interfaces that we **don't** want to conform to, eg ERC1404...
    //   expect({
    //     IERC20: await fast.supportsInterface("0x36372b07"),
    //     IERC165: await fast.supportsInterface("0x01ffc9a7"),
    //     IERC173: await fast.supportsInterface("0x7f5828d0"),
    //     IDiamondCut: await fast.supportsInterface("0x1f931c1c"),
    //     IDiamondLoupe: await fast.supportsInterface("0x48e2b093"),
    //   }).to.be.eql({
    //     IERC20: true,
    //     IERC165: true,
    //     IERC173: true,
    //     IDiamondCut: true,
    //     IDiamondLoupe: true,
    //   });
    // });

    // describe("when running...", () => {
    //   beforeEach(async () => {
    //     // We reset the version to zero before each run, so that the facet thinks it's not initialized yet.
    //     const slot = ethers.utils.solidityKeccak256(
    //       ["string"],
    //       ["Fast.storage"]
    //     );
    //     await ethers.provider.send("hardhat_setStorageAt", [
    //       fast.address,
    //       slot,
    //       numberToBytes32(BigNumber.from(0)),
    //     ]);
    //   });
    // });
  });
});
