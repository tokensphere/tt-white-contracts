import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import {
  Issuer,
  Marketplace,
  FastAccessFacet,
  FastCrowdfundsFacet,
  IERC20,
  Crowdfund,
} from "../../typechain";
import { fastFixtureFunc } from "../fixtures/fast";
chai.use(solidity);
chai.use(smock.matchers);

describe("FastCrowdfundsFacet", () => {
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
    crowdfunds: FastCrowdfundsFacet,
    crowdfundsAsMember: FastCrowdfundsFacet,
    crowdfundsAsGovernor: FastCrowdfundsFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, alice, bob, rob, john] =
      await ethers.getSigners();
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");
    erc20 = await smock.fake("IERC20");
    marketplace.issuerAddress.returns(issuer.address);
  });

  beforeEach(async () => {
    // Issuer is a member of the issuer contract.
    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);
    // Issuer member is an almighty automaton.
    issuer.automatonCan.reset();
    issuer.automatonCan.returns(true);

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
        name: "FastCrowdfundsFixture",
        deployer: deployer.address,
        afterDeploy: async ({ fast }) => {
          crowdfunds = await ethers.getContractAt<FastCrowdfundsFacet>(
            "FastCrowdfundsFacet",
            fast.address
          );
          await fast.connect(issuerMember).addGovernor(governor.address);
          crowdfundsAsMember = crowdfunds.connect(alice);
          crowdfundsAsGovernor = crowdfunds.connect(governor);
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
  });

  /// Governorship related stuff.

  describe("createCrowdfund", async () => {
    it("requires the caller to have the ISSUER_PRIVILEGE_CROWDFUND_CREATOR privileges", async () => {
      issuer.automatonCan.reset();
      issuer.automatonCan.returns(false);
      const subject = crowdfunds.createCrowdfund(
        erc20.address,
        alice.address,
        2_000,
        "Blah"
      );
      await expect(subject).to.have.revertedWith("RequiresPrivilege");
    });

    it("deploys a new crowdfund with the given parameters", async () => {
      await crowdfundsAsGovernor.createCrowdfund(
        erc20.address,
        alice.address,
        2_000,
        "Blah"
      );
      const [page] = await crowdfundsAsGovernor.paginateCrowdfunds(0, 1);
      expect(page.length).to.eq(1);
    });

    describe("deploys a crowdfund and", async () => {
      let tx: any, crowdfundAddr: string, crowdfund: Crowdfund;

      beforeEach(async () => {
        await (tx = crowdfundsAsGovernor.createCrowdfund(
          erc20.address,
          alice.address,
          2_000,
          "Blah"
        ));
        const [crowdfundings] = await crowdfunds.paginateCrowdfunds(0, 1);
        crowdfundAddr = crowdfundings[0];
        crowdfund = await ethers.getContractAt<Crowdfund>(
          "Crowdfund",
          crowdfundAddr
        );
      });

      it("keeps track of the deployed crowdfund", async () => {
        await Promise.all(
          [1, 2].map(() =>
            crowdfundsAsGovernor.createCrowdfund(
              erc20.address,
              alice.address,
              2_000,
              "Blah"
            )
          )
        );
        const [page] = await crowdfunds.paginateCrowdfunds(0, 10);
        expect(page.length).to.eq(3);
      });

      it("emits a CrowdfundDeployed event", async () => {
        await expect(tx)
          .to.emit(crowdfunds, "CrowdfundDeployed")
          .withArgs(crowdfundAddr);
      });
    });
  });

  describe("removeCrowdfund", async () => {
    it("requires the caller to be an issuer member");
    it("removes the crowdfund from the list of deployed crowdfunds");
    it("emits a CrowdfundRemoved event");
    it("reverts when the crowdfund does not exist");
  });

  describe("crowdfundCount", async () => {
    beforeEach(async () => {
      await crowdfundsAsGovernor.createCrowdfund(
        erc20.address,
        alice.address,
        2_000,
        "Blah"
      );
    });

    it("counts all deployed crowdfunds", async () => {
      const subject = await crowdfunds.crowdfundCount();
      expect(subject).to.eq(1);
    });
  });

  describe("paginateCrowdfunds", async () => {
    beforeEach(async () => {
      await crowdfundsAsGovernor.createCrowdfund(
        erc20.address,
        alice.address,
        2_000,
        "Blah"
      );
    });

    it("returns pages of deployed crowdfunds", async () => {
      const [page] = await crowdfunds.paginateCrowdfunds(0, 10);
      expect(page.length).to.eq(1);
    });
  });
});
