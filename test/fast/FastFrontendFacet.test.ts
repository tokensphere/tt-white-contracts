import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import {
  zero,
  abiStructToObj,
  oneHundred,
  impersonateContract,
} from "../utils";
import { Issuer, Marketplace, Fast, FastFrontendFacet } from "../../typechain";
import { fastFixtureFunc, FAST_INIT_DEFAULTS } from "../fixtures/fast";
import { toUnpaddedHexString } from "../../src/utils";

chai.use(solidity);
chai.use(smock.matchers);

describe("FastFrontendFacet", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress,
    member: SignerWithAddress;
  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    frontend: FastFrontendFacet,
    governedFast: Fast,
    issuerMemberFast: Fast;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, member] = await ethers.getSigners();
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");
    // Stub isMember, issuerAddress calls.
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);
    marketplace.issuerAddress.returns(issuer.address);
    marketplace.isMember.whenCalledWith(member.address).returns(true);
    marketplace.isMember.whenCalledWith(governor.address).returns(true);
    marketplace.isMember.returns(false);
    marketplace.isActiveMember.whenCalledWith(member.address).returns(true);
    marketplace.isActiveMember.whenCalledWith(governor.address).returns(true);
    marketplace.isActiveMember.returns(false);
  });

  beforeEach(async () => {
    await fastDeployFixture({
      opts: {
        name: "FastFrontendFixture",
        deployer: deployer.address,
        afterDeploy: async ({ fast }) => {
          await fast.connect(issuerMember).addGovernor(governor.address);
          frontend = await ethers.getContractAt<FastFrontendFacet>(
            "FastFrontendFacet",
            fast.address
          );
          // Add members.
          governedFast = fast.connect(governor);
          issuerMemberFast = fast.connect(issuerMember);
          await governedFast.addMember(member.address);
        },
      },
      initWith: {
        issuer: issuer.address,
        marketplace: marketplace.address,
      },
    });
  });

  describe("emitDetailsChanged", async () => {
    it("requires that the caller is the diamond", async () => {
      const subject = frontend.emitDetailsChanged();
      await expect(subject).to.have.been.revertedWith("InternalMethod");
    });

    it("emits a DetailsChanged event with all the correct information", async () => {
      const frontendAsItself = await impersonateContract(frontend);
      // Fire off the events.
      const subject = frontendAsItself.emitDetailsChanged();
      await subject;

      // Get the other details from a standard `details` function call.
      const detailsObj = abiStructToObj(await frontend.details());

      await expect(subject)
        .to.emit(frontend, "DetailsChanged")
        .withArgs(
          detailsObj.transfersDisabled,
          detailsObj.memberCount,
          detailsObj.governorCount,
          detailsObj.totalSupply,
          detailsObj.reserveBalance
        );
    });
  });

  describe("details", async () => {
    it("returns a populated details struct", async () => {
      await ethers.provider.send("hardhat_setBalance", [
        frontend.address,
        toUnpaddedHexString(oneHundred),
      ]);
      const subject = await frontend.details();
      const subjectObj = abiStructToObj(subject);

      expect(subjectObj).to.eql({
        addr: frontend.address,
        name: FAST_INIT_DEFAULTS.name,
        symbol: FAST_INIT_DEFAULTS.symbol,
        decimals: FAST_INIT_DEFAULTS.decimals,
        totalSupply: zero,
        isSemiPublic: FAST_INIT_DEFAULTS.isSemiPublic,
        hasFixedSupply: FAST_INIT_DEFAULTS.hasFixedSupply,
        transfersDisabled: false,
        reserveBalance: zero,
        memberCount: BigNumber.from(2),
        governorCount: BigNumber.from(1),
      });
    });
  });

  describe("detailedMember", async () => {
    it("returns a MemberDetails struct with the correct information", async () => {
      const subject = await frontend.detailedMember(issuerMember.address);
      const memberObj = abiStructToObj(subject);

      expect(memberObj).to.eql({
        addr: issuerMember.address,
        balance: zero,
        ethBalance: await ethers.provider.getBalance(issuerMember.address),
        isGovernor: false,
      });
    });
  });

  describe("detailedGovernor", async () => {
    beforeEach(async () => {
      await issuerMemberFast.addGovernor(member.address);
    });

    it("returns a GovernorDetails struct with the correct information", async () => {
      const subject = await frontend.detailedGovernor(member.address);
      expect(abiStructToObj(subject)).to.eql({
        addr: member.address,
        ethBalance: await ethers.provider.getBalance(member.address),
        isMember: true,
      });
    });
  });

  describe("paginateDetailedMembers", async () => {
    it("returns member details with next cursor", async () => {
      const [members, nextCursor] = await frontend.paginateDetailedMembers(
        0,
        5
      );
      // Convert the structs to objects.
      const [memberAObj, memberBObj] = members.map(abiStructToObj);

      // Member A details.
      expect(memberAObj).to.eql({
        addr: governor.address,
        balance: zero,
        ethBalance: await ethers.provider.getBalance(governor.address),
        isGovernor: true,
      });

      // Member B details.
      expect(memberBObj).to.eql({
        addr: member.address,
        balance: zero,
        ethBalance: await ethers.provider.getBalance(member.address),
        isGovernor: false,
      });

      // Next cursor.
      expect(nextCursor).to.eq(2);
    });

    it("handles an offset index cursor", async () => {
      // Fetch details of Member passing 1 as an offset index.
      const [members] = await frontend.paginateDetailedMembers(1, 2);
      // Convert the structs to objects.
      const [memberAObj] = members.map(abiStructToObj);

      // Expect Member B.
      expect(memberAObj).to.eql({
        addr: member.address,
        balance: zero,
        ethBalance: await ethers.provider.getBalance(member.address),
        isGovernor: false,
      });
    });
  });

  describe("paginateDetailedGovernors", async () => {
    beforeEach(async () => {
      await issuerMemberFast.addGovernor(member.address);
    });

    it("returns governor details with next cursor", async () => {
      const [[, /*defaultGovernor*/ subject], nextCursor] =
        await frontend.paginateDetailedGovernors(0, 2);

      expect(abiStructToObj(subject)).to.eql({
        addr: member.address,
        ethBalance: await ethers.provider.getBalance(member.address),
        isMember: true,
      });

      // Next cursor.
      expect(nextCursor).to.eq(2);
    });
  });
});
