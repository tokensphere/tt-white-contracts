import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { FastHistoryFacet } from "../../typechain";
import { impersonateContract, abiStructToObj } from "../utils";
import { fastFixtureFunc } from "../fixtures/fast";
import {
  Issuer,
  Marketplace,
} from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
chai.use(solidity);
chai.use(smock.matchers);

describe("FastHistoryFacet", () => {
  let deployer: SignerWithAddress,
    governor: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    john: SignerWithAddress;
  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    history: FastHistoryFacet,
    historyAsItself: FastHistoryFacet,
    governedHistory: FastHistoryFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  const createSupplyProofs = async () => {
    await historyAsItself.minted(1_000, "One");
    await historyAsItself.minted(2_000, "Two");
    await historyAsItself.minted(3_000, "Three");
  };

  const createTransferProofs = async () => {
    // Add a bunch of transfer proofs.
    await historyAsItself.transfered(
      alice.address,
      alice.address,
      john.address,
      100,
      "One"
    );
    await historyAsItself.transfered(
      alice.address,
      bob.address,
      john.address,
      200,
      "Two"
    );
    await historyAsItself.transfered(
      john.address,
      alice.address,
      bob.address,
      300,
      "Three"
    );
  };

  before(async () => {
    // Keep track of a few signers.
    [deployer, governor, alice, bob, john] = await ethers.getSigners();
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");
    marketplace.issuerAddress.returns(issuer.address);

    marketplace.isMember.whenCalledWith(governor.address).returns(true);
    marketplace.isMember.returns(false);
    marketplace.isActiveMember.whenCalledWith(governor.address).returns(true);
    marketplace.isActiveMember.returns(false);
  });

  beforeEach(async () => {
    await fastDeployFixture({
      opts: {
        name: "FastHistoryFixture",
        deployer: deployer.address,
        afterDeploy: async ({ fast }) => {
          history = await ethers.getContractAt<FastHistoryFacet>(
            "FastHistoryFacet",
            fast.address
          );
          governedHistory = history.connect(governor);
        },
      },
      initWith: {
        issuer: issuer.address,
        marketplace: marketplace.address,
        governor: governor.address,
      },
    });

    historyAsItself = await impersonateContract(history);
  });

  /// Supply proofs.

  describe("minted", async () => {
    it("requires that the caller is the token (anonymous)", async () => {
      const subject = history.minted(1, "One");
      await expect(subject).to.have.revertedWith("InternalMethod");
    });

    it("requires that the caller is the token (governor)", async () => {
      const subject = governedHistory.minted(2, "Two");
      await expect(subject).to.have.revertedWith("InternalMethod");
    });

    describe("as the diamond", async () => {
      it("adds an entry to the supply proof list", async () => {
        await historyAsItself.minted(3, "Three");
        const [[{ amount, ref, blockNumber }]] =
          await history.paginateSupplyProofs(0, 1);
        expect(amount).to.eq(3);
        expect(ref).to.eq("Three");
        expect(blockNumber.toNumber()).to.be.greaterThan(1);
      });
    });
  });

  describe("burnt", async () => {
    it("requires that the caller is the diamond (anonymous)", async () => {
      const subject = history.burnt(1, "One");
      await expect(subject).to.have.revertedWith("InternalMethod");
    });

    it("requires that the caller is the diamond (governor)", async () => {
      const subject = governedHistory.burnt(2, "Two");
      await expect(subject).to.have.revertedWith("InternalMethod");
    });

    describe("as the diamond", async () => {
      it("adds an entry to the supply proof list", async () => {
        await historyAsItself.burnt(3, "Three");
        const [[{ amount, ref, blockNumber }]] =
          await history.paginateSupplyProofs(0, 1);
        expect(amount).to.eq(3);
        expect(ref).to.eq("Three");
        expect(blockNumber.toNumber()).to.be.greaterThan(1);
      });
    });
  });

  describe("supplyProofCount", async () => {
    beforeEach(createSupplyProofs);

    it("counts how many supply proofs have been stored", async () => {
      const subject = await history.supplyProofCount();
      expect(subject).to.eq(3);
    });
  });

  describe("paginateSupplyProofs", async () => {
    beforeEach(createSupplyProofs);

    it("returns the cursor to the next page", async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [, cursor] = await history.paginateSupplyProofs(0, 3);
      expect(cursor).to.eq(3);
    });

    it("does not crash when overflowing and returns the correct cursor", async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [, cursor] = await history.paginateSupplyProofs(1, 10);
      expect(cursor).to.eq(3);
    });

    it("returns the supply proofs in the order they were added", async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [proofs] = await history.paginateSupplyProofs(0, 10);
      const proofsWithoutBlockNumbers = proofs
        .map(abiStructToObj)
        .map(({ blockNumber, ...rest }) => rest);
      expect(proofsWithoutBlockNumbers).to.eql([
        {
          amount: BigNumber.from(1_000),
          op: 0,
          ref: "One",
        },
        {
          amount: BigNumber.from(2_000),
          op: 0,
          ref: "Two",
        },
        {
          amount: BigNumber.from(3_000),
          op: 0,
          ref: "Three",
        },
      ]);
    });
  });

  /// Transfer proofs.

  describe("transfered", async () => {
    it("requires that the caller is the token (anonymous)", async () => {
      const subject = history.transfered(
        alice.address,
        bob.address,
        john.address,
        100,
        "Attempt 1"
      );
      await expect(subject).to.have.revertedWith("InternalMethod");
    });

    it("requires that the caller is the token (governor)", async () => {
      const subject = governedHistory.transfered(
        alice.address,
        bob.address,
        john.address,
        100,
        "Attempt 2"
      );
      await expect(subject).to.have.revertedWith("InternalMethod");
    });

    it("adds an entry to the transfer proof list", async () => {
      await createTransferProofs();
      const [proofs] = await history.paginateTransferProofs(0, 1);
      const [proofWithoutBlockNumber] = proofs
        .map(abiStructToObj)
        .map(({ blockNumber, ...rest }) => rest);
      expect(proofWithoutBlockNumber).to.be.eql({
        spender: alice.address,
        from: alice.address,
        to: john.address,
        amount: BigNumber.from(100),
        ref: "One",
      });
    });
  });

  describe("transferProofCount", async () => {
    it("counts how many transfer proofs have been stored", async () => {
      await createTransferProofs();
      const subject = await history.transferProofCount();
      expect(subject).to.eq(3);
    });
  });

  describe("paginateTransferProofs", async () => {
    beforeEach(createTransferProofs);

    it("returns the cursor to the next page", async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [, cursor] = await history.paginateTransferProofs(0, 3);
      expect(cursor).to.eq(3);
    });

    it("does not crash when overflowing and returns the correct cursor", async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [, cursor] = await history.paginateTransferProofs(1, 10);
      expect(cursor).to.eq(3);
    });

    it("returns the transfer proofs in the order they were added", async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [proofs] = await history.paginateTransferProofs(0, 10);
      const proofsWithoutBlockNumbers = proofs
        .map(abiStructToObj)
        .map(({ blockNumber, ...rest }) => rest);
      // Check all proofs in order.
      expect(proofsWithoutBlockNumbers).to.eql([
        {
          amount: BigNumber.from(100),
          spender: alice.address,
          from: alice.address,
          to: john.address,
          ref: "One",
        },
        {
          amount: BigNumber.from(200),
          spender: alice.address,
          from: bob.address,
          to: john.address,
          ref: "Two",
        },
        {
          amount: BigNumber.from(300),
          spender: john.address,
          from: alice.address,
          to: bob.address,
          ref: "Three",
        },
      ]);
    });
  });

  describe("paginateTransferProofsByInvolvee", async () => {
    let blockNumber = 0;

    beforeEach(async () => {
      // Snapshot the current block number.
      blockNumber = await ethers.provider.getBlockNumber();
      await createTransferProofs();
    });

    it("returns the cursor to the next page", async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [, /* proofs */ nextCursor] =
        await history.paginateTransferProofsByInvolvee(john.address, 0, 2);
      expect(nextCursor).to.eq(2);
    });

    it("does not crash when overflowing and returns the correct cursor (bob)", async () => {
      const [, /* proofs */ nextCursor] =
        await history.paginateTransferProofsByInvolvee(bob.address, 1, 10);
      expect(nextCursor).to.eq(2);
    });

    it("does not crash when overflowing and returns the correct cursor (john)", async () => {
      const [, /* proofs */ nextCursor] =
        await history.paginateTransferProofsByInvolvee(john.address, 1, 10);
      expect(nextCursor).to.eq(2);
    });

    it(
      "counts the proofs regardless of the involvement (sender and recipient)"
    );

    it("categorizes the proofs for the senders", async () => {
      const [proofs] = await history.paginateTransferProofsByInvolvee(
        bob.address,
        0,
        10
      );
      const proofsAsObjs = proofs.map(abiStructToObj);

      // Check all proofs.
      expect(proofsAsObjs).to.be.eql([
        {
          spender: alice.address,
          from: bob.address,
          to: john.address,
          amount: BigNumber.from(200),
          blockNumber: BigNumber.from(blockNumber + 2),
          ref: "Two",
        },
        {
          spender: john.address,
          from: alice.address,
          to: bob.address,
          amount: BigNumber.from(300),
          blockNumber: BigNumber.from(blockNumber + 3),
          ref: "Three",
        },
      ]);
    });

    // it('categorizes the proofs for the recipients', async () => {
    //   const [proofs, /* nextCursor */] = await history.paginateTransferProofsByInvolvee(john.address, 0, 5);
    //   // Check all proofs in order.
    //   expect(proofs[0]).to.eq(0);
    //   expect(proofs[1]).to.eq(1);
    //   expect(proofs[2]).to.eq(2);
    //   expect(proofs[3]).to.eq(3);
    //   expect(proofs[4]).to.eq(4);
    // });
  });

  describe("paginateTransferProofIndicesByInvolvee", async () => {
    beforeEach(createTransferProofs);

    it("returns a paginated list of addresses and cursor", async () => {
      const [proofs, nextCursor] =
        await history.paginateTransferProofIndicesByInvolvee(bob.address, 0, 5);

      // Expecting 2 proof indexes.
      expect(proofs).to.be.eql([BigNumber.from(1), BigNumber.from(2)]);

      // Expect that the next cursor is 3.
      expect(nextCursor).to.be.eq(2);
    });
  });

  describe("transferProofByInvolveeCount", async () => {
    beforeEach(createTransferProofs);

    it("returns the count of the transfer proofs for a given address", async () => {
      const subject = await history.transferProofByInvolveeCount(bob.address);
      expect(subject).to.be.eq(2);
    });
  });
});
