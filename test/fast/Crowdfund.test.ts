import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { BigNumber } from "ethers";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { ethers } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import {
  Issuer,
  Marketplace,
  Crowdfund,
  Crowdfund__factory,
  IERC20,
  Fast,
} from "../../typechain";
chai.use(solidity);
chai.use(smock.matchers);

describe("Crowdfunds", () => {
  let
    deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress,
    automaton: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    paul: SignerWithAddress,
    ben: SignerWithAddress;

  let
    issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    fast: FakeContract<Fast>,
    crowdfund: Crowdfund,
    crowdfundAsIssuer: Crowdfund,
    crowdfundAsAutomaton: Crowdfund,
    deployCrowdfund: (params: Crowdfund.ParamsStruct) => void,
    validCrowdfundParams: Crowdfund.ParamsStruct,
    erc20: FakeContract<IERC20>;

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, automaton, alice, bob, paul, ben] = await ethers.getSigners();
  });

  // Before each test, we want to allow impersonating the FAST contract address and fund it.
  beforeEach(async () => {
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");
    fast = await smock.fake("Fast");
    erc20 = await smock.fake("IERC20");

    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);

    marketplace.issuerAddress.reset();
    marketplace.issuerAddress.returns(issuer.address);
    marketplace.isMember.reset();
    marketplace.isMember.whenCalledWith(governor.address).returns(true);
    marketplace.isMember.returns(false);
    marketplace.isActiveMember.reset();
    marketplace.isActiveMember.whenCalledWith(governor.address).returns(true);
    marketplace.isActiveMember.returns(false);

    fast.issuerAddress.reset();
    fast.issuerAddress.returns(issuer.address);
    fast.marketplaceAddress.reset();
    fast.marketplaceAddress.returns(marketplace.address);
    fast.isMember.reset();
    fast.isMember.whenCalledWith(alice.address).returns(true);
    fast.isMember.whenCalledWith(bob.address).returns(true);
    fast.isMember.whenCalledWith(paul.address).returns(true);
    fast.automatonCan.reset();

    erc20.balanceOf.reset();
    erc20.transfer.reset();

    await hre.network.provider.request({ method: "hardhat_impersonateAccount", params: [fast.address] });
    await ethers.provider.send("hardhat_setBalance", [fast.address, "0xfffffffffffffffffff"]);

    validCrowdfundParams = {
      owner: governor.address,
      beneficiary: alice.address,
      issuer: issuer.address,
      fast: fast.address,
      token: erc20.address,
    };

    deployCrowdfund = async (params) => {
      // Deploy the Crowdfund contract.
      const factory = await ethers.getContractFactory<Crowdfund__factory>("Crowdfund");
      crowdfund =
        await factory
          .connect(await ethers.getSigner(fast.address))
          .deploy({ ...params, fast: fast.address });
      crowdfundAsIssuer = crowdfund.connect(issuerMember);
      crowdfundAsAutomaton = crowdfund.connect(automaton);
    }
  });

  describe("various synthesized getters", async () => {
    beforeEach(async () => {
      await deployCrowdfund(validCrowdfundParams);
    });

    it("expose VERSION", async () => {
      expect(await crowdfund.VERSION()).to.be.eq(1);
    });

    it("expose initial params");
    it("expose phase");
    it("expose basisPointsFee");
    it("expose collected");
    it("exposes creationBlock");
  });

  describe("constructor", async () => {
    describe("with the correct params passed", async () => {
      beforeEach(async () => {
        await deployCrowdfund(validCrowdfundParams);
      });

      it("stores its initial parameters");
      it("stores the creation block");
    });

    describe("with invalid parameters", async () => {
      it("requires the owner to be a member of the FAST contract");
      it("requires the beneficiary to be a member of the FAST contract");
    });
  });

  describe("feeAmount", async () => {
    it("returns the rounded up fee given the collected amount and fee basis points")
  });

  describe("advanceToFunding", async () => {
    describe("from an invalid phase", async () => {
      it("reverts");
    });

    describe("from the Setup phase", async () => {
      it("requires the caller to be an issuer member");
      it("requires that the fee basis points is set bellow 100%");
      it("stores basisPointsFee");
      it("moves to the Funding phase");
      it("emits an Advance event");
    });
  });

  describe("pledge", async () => {
    describe("from an invalid phase", async () => {
      it("reverts");
    });

    describe("from the Funding phase", async () => {
      it("requires the caller to be a member of the FAST contract");
      it("requires the amount to not be zero");
      it("checks the allowance of the crowdfunding contract with the ERC20 contract");
      it("keeps track of the pledger");
      it("keeps track of the amount pledged");
      it("accumulates the total amount pledged");
      it("delegates to the ERC20 token to transfer the funds to the crowdfunding contract");
      it("reverts if the ERC20 transfer fails");
      it("emits a Pledge event");
    });
  });

  describe("terminate", async () => {
    describe("upon success", async () => {
      it("requires the caller to be a manager");
      it("calculates and transfers the fee to the issuer contract");
      it("reverts if the ERC20 fee transfer fails");
      it("transfers the rest of the funds to the beneficiary");
      it("reverts if the ERC20 beneficiary transfer fails");
      it("advances to the Success phase");
    });
    describe("upon failure", async () => {
      it("requires the caller to be a manager");
      it("advances to the Failure phase");
    });
  });

  describe("withdraw", async () => {
    describe("from an invalid phase", async () => {
      it("reverts");
    });

    describe("from the Failure phase", async () => {
      it("requires the beneficiary to be in the list of pledgers");
      it("sets the pledger's amount to zero");
      it("uses the ERC20 token to transfer the funds back to the pledger");
      it("reverts if the ERC20 transfer fails");
    });
  });
});
