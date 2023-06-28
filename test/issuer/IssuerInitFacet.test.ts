import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { smock } from "@defi-wonderland/smock";
import { IssuerAccessFacet, IssuerInitFacet } from "../../typechain";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { BigNumber, ContractTransaction } from "ethers";
import { issuerFixtureFunc } from "../fixtures/issuer";
import { ZERO_ADDRESS } from "../../src/utils";
import { Issuer } from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
chai.use(solidity);
chai.use(smock.matchers);

describe("IssuerInitFacet", () => {
  let deployer: SignerWithAddress, issuerMember: SignerWithAddress;
  let issuer: Issuer, initTx: ContractTransaction, access: IssuerAccessFacet;

  const issuerDeployFixture = deployments.createFixture(issuerFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember] = await ethers.getSigners();
  });

  beforeEach(async () => {
    await issuerDeployFixture({
      opts: {
        name: "IssuerInitFixture",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ issuer, initTx } = args);
          access = await ethers.getContractAt<IssuerAccessFacet>(
            "IssuerAccessFacet",
            issuer.address
          );
        },
      },
      initWith: {
        member: issuerMember.address,
      },
    });
  });

  describe("initialize", () => {
    it("requires that it is not initialized", async () => {
      // Attempt to re-initialize.
      const initIssuer = await ethers.getContractAt<IssuerInitFacet>(
        "IssuerInitFacet",
        issuer.address
      );
      const subject = initIssuer.initialize({ member: ZERO_ADDRESS });
      await expect(subject).to.be.revertedWith("AlreadyInitialized");
    });

    it("set various storage versions", async () => {
      // Query the slot and parse out the STORAGE_VERSION.
      const slot = ethers.utils.solidityKeccak256(
        ["string"],
        ["Issuer.storage"]
      );
      const subject = await ethers.provider.send("eth_getStorageAt", [
        issuer.address,
        slot,
        "latest",
      ]);
      // Expectations.
      expect(BigNumber.from(subject).toString()).to.eq("1");
    });

    it("registers supported interfaces", async () => {
      expect({
        IERC165: await issuer.supportsInterface("0x01ffc9a7"),
        IERC173: await issuer.supportsInterface("0x7f5828d0"),
        IDiamondCut: await issuer.supportsInterface("0x1f931c1c"),
        IDiamondLoupe: await issuer.supportsInterface("0x48e2b093"),
      }).to.be.eql({
        IERC165: true,
        IERC173: true,
        IDiamondCut: true,
        IDiamondLoupe: true,
      });
    });

    it("adds the given address to the member list", async () => {
      const subject = await access.isMember(issuerMember.address);
      expect(subject).to.eq(true);
    });

    it("emits a MemberAdded event", async () => {
      await expect(initTx)
        .to.emit(issuer, "MemberAdded")
        .withArgs(issuerMember.address);
    });
  });
});
