import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import {
  FastAccessFacet,
  FastDistributionsFacet,
  IERC20,
  Distribution,
  IForwarder,
  Fast
} from "../../typechain";
import { fastFixtureFunc } from "../fixtures/fast";
import { DistributionPhase, impersonateContract, abiStructToObj } from "../utils";
import {
  Issuer,
  Marketplace,
} from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
chai.use(solidity);
chai.use(smock.matchers);

describe("FastDistributionsFacet", () => {
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
    forwarder: FakeContract<IForwarder>,
    fast: Fast,
    distributions: FastDistributionsFacet,
    distributionsAsMember: FastDistributionsFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  const resetIForwarderMock = () => {
    forwarder.supportsInterface.reset();
    forwarder.supportsInterface.whenCalledWith(/* IForwarder */ "0x25e23e64").returns(true);
    forwarder.supportsInterface.returns(false);
  }

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, alice, bob, rob, john] =
      await ethers.getSigners();
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");
    erc20 = await smock.fake("IERC20");
    forwarder = await smock.fake("IForwarder");
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

    await ethers.provider.send("hardhat_setBalance", [
      alice.address,
      "0xffffffffffffffffffff",
    ]);

    await fastDeployFixture({
      opts: {
        name: "FastDistributionsFixture",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ fast } = args);
          await fast.connect(issuerMember).addGovernor(governor.address);
          distributions = await ethers.getContractAt<FastDistributionsFacet>(
            "FastDistributionsFacet",
            fast.address
          );
          distributionsAsMember = distributions.connect(alice);
          const access = await ethers.getContractAt<FastAccessFacet>(
            "FastAccessFacet",
            fast.address
          );
          await access.connect(governor).addMember(alice.address);
        },
      },
      initWith: {
        issuer: issuer.address,
        marketplace: marketplace.address,
      },
    });

    resetIForwarderMock();
  });

  describe("AHasContext implementation", () => {
    describe("_isTrustedForwarder", () => {
      it("returns true if the address is a trusted forwarder", async () => {
        await fast.connect(issuerMember).setTrustedForwarder(forwarder.address);

        // isTrustedForwarder() should delegate to _isTrustedForwarder().
        const subject = await fast.connect(issuerMember).isTrustedForwarder(forwarder.address);
        expect(subject).to.eq(true);
      });
    });

    describe("_msgSender", () => {
      it("returns the original msg.sender");
    });
  });

  /// Governorship related stuff.

  describe("createDistribution", () => {
    it("requires the caller to be a FAST member", async () => {
      const subject = distributions.createDistribution(
        erc20.address,
        100,
        0,
        "Blah"
      );
      await expect(subject).to.have.revertedWith("RequiresFastMembership");
    });

    it("reverts if the allowance of the ERC20 token is not enough", async () => {
      const subject = distributionsAsMember.createDistribution(
        erc20.address,
        101,
        0,
        "Blah"
      );
      await expect(subject).to.have.revertedWith("InsufficientFunds");
    });

    it("deploys a new distribution with the given parameters", async () => {
      await distributionsAsMember.createDistribution(
        erc20.address,
        100,
        0,
        "Blah"
      );
      const [page] = await distributions.paginateDistributions(0, 10);
      expect(page.length).to.eq(1);
    });

    it("is callable by a trusted forwarder", async () => {
      // Set the trusted forwarder.
      await fast.connect(issuerMember).setTrustedForwarder(forwarder.address);

      // Impersonate the trusted forwarder contract.
      const distributionsAsForwarder = await impersonateContract(distributions, forwarder.address);

      // Build the data to call the sponsored function.
      // Pack the original msg.sender address at the end - this is sponsored callers address.
      const encodedFunctionCall = await distributions.interface.encodeFunctionData("createDistribution", [erc20.address, 100, 0, "Reference"]);
      const data = ethers.utils.solidityPack(
        ["bytes", "address"],
        [encodedFunctionCall, alice.address]
      );

      // As the forwarder send the packed transaction.
      await distributionsAsForwarder.signer.sendTransaction(
        {
          data: data,
          to: distributions.address,
        }
      );

      // Inspect the owner of the Distribution.
      const [page] = await distributions.paginateDistributions(0, 1);
      const distribution = await ethers.getContractAt<Distribution>("Distribution", page[0]);
      const subject = abiStructToObj(await distribution.paramsStruct());
      expect(subject.distributor).to.eq(alice.address);
    });

    describe("deploys a distribution and", () => {
      let tx: any, distAddr: string, dist: Distribution;

      beforeEach(async () => {
        await (tx = distributionsAsMember.createDistribution(
          erc20.address,
          100,
          0,
          "Blah"
        ));
        const [dists] = await distributions.paginateDistributions(0, 1);
        distAddr = dists[0];
        dist = await ethers.getContractAt("Distribution", distAddr);
      });

      it("keeps track of the deployed distribution", async () => {
        await Promise.all(
          [1, 2].map(() =>
            distributionsAsMember.createDistribution(
              erc20.address,
              100,
              0,
              "Blah"
            )
          )
        );
        const [page] = await distributions.paginateDistributions(0, 10);
        expect(page.length).to.eq(3);
      });

      it("call the ERC20.transferFrom with the correct arguments", async () => {
        expect(erc20.transferFrom).to.have.been.calledOnceWith(
          alice.address,
          distAddr,
          100
        );
      });

      it("advances the distribution to the FeeSetup phase", async () => {
        const subject = await dist.phase();
        expect(subject).to.eq(DistributionPhase.FeeSetup);
      });

      it("emits a DistributionDeployed event", async () => {
        await expect(tx)
          .to.emit(distributions, "DistributionDeployed")
          .withArgs(distAddr);
      });
    });
  });

  describe("removeDistribution", () => {
    let tx: any, distAddr: string, dist: Distribution;

    beforeEach(async () => {
      await (tx = distributionsAsMember.createDistribution(
        erc20.address,
        100,
        0,
        "Blah"
      ));
      const [dists] = await distributions.paginateDistributions(0, 1);
      distAddr = dists[0];
      dist = await ethers.getContractAt("Distribution", distAddr);
    });

    it("requires the caller to be an issuer member", async () => {
      const subject = distributions.removeDistribution(distAddr);
      await expect(subject).to.have.revertedWith("RequiresIssuerMembership");
    });

    it("removes the distribution from the list of deployed distributions", async () => {
      // Remove...
      distributions.connect(issuerMember).removeDistribution(distAddr);

      const subject = await distributions.distributionCount();
      expect(subject).to.eq(0);
    });

    it("emits a DistributionRemoved event", async () => {
      await expect(distributions.connect(issuerMember).removeDistribution(distAddr))
        .to.emit(distributions, "DistributionRemoved")
        .withArgs(distAddr);
    });

    it("reverts when the distribution does not exist", async () => {
      const subject = distributions.connect(issuerMember).removeDistribution("0x0");
      await expect(subject).to.have.revertedWith("");
    });
  });

  describe("distributionCount", () => {
    beforeEach(async () => {
      await Promise.all(
        [1, 2, 3, 4, 5].map(() =>
          distributionsAsMember.createDistribution(
            erc20.address,
            100,
            0,
            "Blah"
          )
        )
      );
    });

    it("counts all deployed distributions", async () => {
      const subject = await distributions.distributionCount();
      expect(subject).to.eq(5);
    });
  });

  describe("paginateDistributions", () => {
    it("returns pages of deployed distributions");
  });
});
