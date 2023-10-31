import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { PaymasterTopFacet, PaymasterInitFacet } from "../../typechain";
import { paymasterFixtureFunc } from "../fixtures/paymaster";
import { BigNumber } from "ethers";
import { impersonateContract } from "../utils";
import { DEPLOYER_FACTORY_COMMON } from "../../src/utils";
import {
  Marketplace,
  Issuer,
  Paymaster,
} from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
chai.use(solidity);
chai.use(smock.matchers);

describe("PaymasterInitFacet", () => {
  let deployer: SignerWithAddress;
  let marketplace: FakeContract<Marketplace>,
    issuer: FakeContract<Issuer>,
    paymaster: Paymaster,
    top: PaymasterTopFacet;

  const paymasterDeployFixture = deployments.createFixture(
    paymasterFixtureFunc
  );

  before(async () => {
    // Keep track of a few signers.
    [deployer] = await ethers.getSigners();
    // Mock a Marketplace contract.
    marketplace = await smock.fake("Marketplace");
    // Mock an Issuer contract.
    issuer = await smock.fake("Issuer");
  });

  beforeEach(async () => {
    await paymasterDeployFixture({
      opts: {
        name: "PaymasterInitFixture",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ paymaster } = args);
          top = await ethers.getContractAt<PaymasterTopFacet>(
            "PaymasterTopFacet",
            paymaster.address
          );
        },
      },
      initWith: {
        marketplace: marketplace.address,
        issuer: issuer.address,
      },
    });
  });

  describe("initialize", () => {
    it("requires that it is not initialized", async () => {
      // Attempt to re-initialize.
      const paymasterInit = await ethers.getContractAt<PaymasterInitFacet>(
        "PaymasterInitFacet",
        paymaster.address
      );
      const paymasterInitAsItself = await impersonateContract(
        paymasterInit,
        DEPLOYER_FACTORY_COMMON.factory
      );
      const subject = paymasterInitAsItself.initialize({
        marketplace: marketplace.address,
        issuer: issuer.address,
      });

      await expect(subject).to.have.revertedWith("AlreadyInitialized");
    });

    it("set various storage versions", async () => {
      // Query the slot and parse out the STORAGE_VERSION.
      const slot = ethers.utils.solidityKeccak256(
        ["string"],
        ["Paymaster.storage"]
      );
      const data = await ethers.provider.send("eth_getStorageAt", [
        paymaster.address,
        slot,
        "latest",
      ]);
      // Slice out the final 2 bytes to get the version.
      const subject = ethers.utils.hexDataSlice(data, 30, 32);

      // Expectations.
      expect(BigNumber.from(subject).toString()).to.eq("1");
    });

    it("registers supported interfaces", async () => {
      expect({
        IERC165: await paymaster.supportsInterface("0x01ffc9a7"),
        IERC173: await paymaster.supportsInterface("0x7f5828d0"),
        IDiamondCut: await paymaster.supportsInterface("0x1f931c1c"),
        IDiamondLoupe: await paymaster.supportsInterface("0x48e2b093"),
        IPaymaster: await paymaster.supportsInterface("0xe1ab2dea"),
      }).to.be.eql({
        IERC165: true,
        IERC173: true,
        IDiamondCut: true,
        IDiamondLoupe: true,
        IPaymaster: true,
      });
    });

    it("stores the given Marketplace address")
    it("stores the given Issuer address")
  });
});
