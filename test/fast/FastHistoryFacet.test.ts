import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { Spc, Exchange, FastHistoryFacet } from '../../typechain';
import { INTERNAL_METHOD, impersonateDiamond, structToObj } from '../utils';
import { fastFixtureFunc } from '../fixtures/fast';
chai.use(solidity);
chai.use(smock.matchers);


describe('FastHistoryFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    governor: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    john: SignerWithAddress,
    rob: SignerWithAddress;
  let spc: FakeContract<Spc>,
    exchange: FakeContract<Exchange>,
    history: FastHistoryFacet,
    governedHistory: FastHistoryFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, governor, alice, bob, john, rob] = await ethers.getSigners();
    // Mock an SPC and an Exchange contract.
    spc = await smock.fake('Spc');
    exchange = await smock.fake('Exchange');
    exchange.spcAddress.returns(spc.address);
  });

  beforeEach(async () => {
    await fastDeployFixture({
      opts: {
        name: 'FastHistoryFixture',
        deployer: deployer.address,
        afterDeploy: async ({ fast }) => {
          history = await ethers.getContractAt<FastHistoryFacet>('FastHistoryFacet', fast.address);
          governedHistory = history.connect(governor);
        }
      },
      initWith: {
        spc: spc.address,
        exchange: exchange.address,
        governor: governor.address
      }
    });
  });

  /// Supply proofs.

  describe('burnt', async () => {
    it('requires that the caller is the diamond (anonymous)', async () => {
      const subject = history.burnt(1, 'One');
      await expect(subject).to.have
        .revertedWith(INTERNAL_METHOD);
    });

    it('requires that the caller is the diamond (governor)', async () => {
      const subject = governedHistory.burnt(2, 'Two');
      await expect(subject).to.have
        .revertedWith(INTERNAL_METHOD);
    });

    describe('as the diamond', async () => {
      let tokenAsItself: FastHistoryFacet;

      beforeEach(async () => {
        tokenAsItself = await impersonateDiamond(history);
      });

      afterEach(async () => {
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [history.address]);
      });

      it('adds an entry to the supply proof list', async () => {
        await tokenAsItself.burnt(3, 'Three');
        const [[{ amount, ref, blockNumber }],] = await history.paginateSupplyProofs(0, 1);
        expect(amount).to.eq(3);
        expect(ref).to.eq('Three');
        expect(blockNumber.toNumber()).to.be.greaterThan(1);
      });
    });
  });

  describe('minted', async () => {
    it('requires that the caller is the token (anonymous)', async () => {
      const subject = history.minted(1, 'One');
      await expect(subject).to.have
        .revertedWith(INTERNAL_METHOD);
    });

    it('requires that the caller is the token (governor)', async () => {
      const subject = governedHistory.minted(2, 'Two');
      await expect(subject).to.have
        .revertedWith(INTERNAL_METHOD);
    });

    describe('as the diamond', async () => {
      let tokenAsItself: FastHistoryFacet;

      beforeEach(async () => {
        tokenAsItself = await impersonateDiamond(history);
      });

      afterEach(async () => {
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [history.address]);
      });

      it('adds an entry to the supply proof list', async () => {
        await tokenAsItself.minted(3, 'Three');
        const [[{ amount, ref, blockNumber }],] = await history.paginateSupplyProofs(0, 1);
        expect(amount).to.eq(3);
        expect(ref).to.eq('Three');
        expect(blockNumber.toNumber()).to.be.greaterThan(1);
      });
    });

  });

  describe('supplyProofCount', async () => {
    let tokenAsItself: FastHistoryFacet;

    beforeEach(async () => {
      tokenAsItself = await impersonateDiamond(history);

      // Add a bunch of supply proofs.
      await Promise.all(['One', 'Two', 'Three'].map((value, index) => {
        return tokenAsItself.minted(index, value);
      }));
    });

    afterEach(async () => {
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [history.address]);
    });

    it('counts how many supply proofs have been stored', async () => {
      const subject = await history.supplyProofCount();
      expect(subject).to.eq(3);
    });
  });

  describe('paginateSupplyProofs', async () => {
    let tokenAsItself: FastHistoryFacet;

    beforeEach(async () => {
      tokenAsItself = await impersonateDiamond(history);

      // Add a bunch of supply proofs.
      await Promise.all(['One', 'Two', 'Three'].map((value, index) => {
        return tokenAsItself.minted((index + 1) * 100, value);
      }));
    });

    afterEach(async () => {
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [history.address]);
    });

    it('returns the cursor to the next page', async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [, cursor] = await history.paginateSupplyProofs(0, 3);
      expect(cursor).to.eq(3);
    });

    it('does not crash when overflowing and returns the correct cursor', async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [, cursor] = await history.paginateSupplyProofs(1, 10);
      expect(cursor).to.eq(3);
    });

    it('returns the supply proofs in the order they were added', async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [[proof1, proof2, proof3],] = await history.paginateSupplyProofs(0, 3);
      // Check all proofs in order.
      expect(proof1.amount).to.eq(100);
      expect(proof1.ref).to.eq('One');
      expect(proof2.amount).to.eq(200);
      expect(proof2.ref).to.eq('Two');
      expect(proof3.amount).to.eq(300);
      expect(proof3.ref).to.eq('Three');
    });
  });

  /// Transfer proofs.

  describe('transfered', async () => {
    it('requires that the caller is the token (anonymous)', async () => {
      const subject = history.transfered(alice.address, bob.address, john.address, 100, 'Attempt 1');
      await expect(subject).to.have
        .revertedWith(INTERNAL_METHOD);
    });

    it('requires that the caller is the token (governor)', async () => {
      const subject = governedHistory.transfered(alice.address, bob.address, john.address, 100, 'Attempt 2');
      await expect(subject).to.have
        .revertedWith(INTERNAL_METHOD);
    });

    describe('as the diamond', async () => {
      let tokenAsItself: FastHistoryFacet;

      beforeEach(async () => {
        tokenAsItself = await impersonateDiamond<FastHistoryFacet>(history);

        // Add a bunch of supply proofs.
        await Promise.all(['One', 'Two', 'Three'].map((value, index) => {
          return tokenAsItself.minted((index + 1) * 100, value);
        }));
      });

      afterEach(async () => {
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [history.address]);
      });

      it('adds an entry to the transfer proof list', async () => {
        tokenAsItself.transfered(alice.address, bob.address, john.address, 300, 'Attempt 3');
        const [[{ spender, from, to, amount, ref, blockNumber }],] = await history.paginateTransferProofs(0, 1);
        expect(spender).to.eq(alice.address);
        expect(from).to.eq(bob.address);
        expect(to).to.eq(john.address);
        expect(amount).to.eq(300);
        expect(ref).to.eq('Attempt 3');
        expect(blockNumber.toNumber()).to.be.greaterThan(1);
      });
    });
  });

  describe('transferProofCount', async () => {
    let tokenAsItself: FastHistoryFacet;

    beforeEach(async () => {
      tokenAsItself = await impersonateDiamond<FastHistoryFacet>(history);

      // Add a bunch of transfer proofs.
      await Promise.all(['One', 'Two', 'Three'].map((value, index) => {
        return tokenAsItself.transfered(alice.address, bob.address, john.address, (index + 1) * 100, value);
      }));
    });

    afterEach(async () => {
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [history.address]);
    });

    it('counts how many transfer proofs have been stored', async () => {
      const subject = await history.transferProofCount();
      expect(subject).to.eq(3);
    });
  });

  describe('paginateTransferProofs', async () => {
    beforeEach(async () => {
      let tokenAsItself = await impersonateDiamond<FastHistoryFacet>(history);

      // Add a bunch of transfer proofs.
      await Promise.all(['One', 'Two', 'Three'].map((value, index) => {
        return tokenAsItself.transfered(alice.address, bob.address, john.address, (index + 1) * 100, value);
      }));

      await ethers.provider.send("hardhat_stopImpersonatingAccount", [history.address]);
    });

    it('returns the cursor to the next page', async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [, cursor] = await history.paginateTransferProofs(0, 3);
      expect(cursor).to.eq(3);
    });

    it('does not crash when overflowing and returns the correct cursor', async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [, cursor] = await history.paginateTransferProofs(1, 10);
      expect(cursor).to.eq(3);
    });

    it('returns the transfer proofs in the order they were added', async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [[proof1, proof2, proof3],] = await history.paginateTransferProofs(0, 3);
      // Check all proofs in order.
      expect(proof1.amount).to.eq(100);
      expect(proof1.ref).to.eq('One');
      expect(proof2.amount).to.eq(200);
      expect(proof2.ref).to.eq('Two');
      expect(proof3.amount).to.eq(300);
      expect(proof3.ref).to.eq('Three');
    });
  });

  describe('paginateTransferProofsByInvolvee', async () => {
    let blockNumber = 0;

    beforeEach(async () => {
      let tokenAsItself = await impersonateDiamond<FastHistoryFacet>(history);

      // Snapshot the current block number.
      blockNumber = await ethers.provider.getBlockNumber();

      // Add three transfers from bob to john performed by alice.
      await Promise.all(['A1', 'A2', 'A3'].map((value, index) => {
        return tokenAsItself.transfered(alice.address, bob.address, john.address, (index + 1) * 100, value);
      }));
      // Add three transfers from john to rob performed by bob.
      await Promise.all(['B1', 'B2'].map((value, index) => {
        return tokenAsItself.transfered(bob.address, john.address, rob.address, (index + 1) * 100, value);
      }));

      // Turn off impersonating the diamond.
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [history.address]);
    });

    it('returns the cursor to the next page', async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [/* proofs */, nextCursor] = await history.paginateTransferProofsByInvolvee(bob.address, 0, 3);
      expect(nextCursor).to.eq(3);
    });

    it('does not crash when overflowing and returns the correct cursor', async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [/* proofs */, nextCursor] = await history.paginateTransferProofsByInvolvee(bob.address, 1, 10);
      expect(nextCursor).to.eq(3);
    });

    it('counts the proofs regardless of the involvement (sender and recipient)', async () => {
      it('does not crash when overflowing and returns the correct cursor', async () => {
        const [/* proofs */, nextCursor] = await history.paginateTransferProofsByInvolvee(john.address, 1, 10);
        expect(nextCursor).to.eq(5);
      });
    });

    it('categorizes the proofs for the senders', async () => {
      const [proofs, /* nextCursor */] = await history.paginateTransferProofsByInvolvee(bob.address, 0, 3);
      const proofsAsObjs = proofs.map(proof => structToObj(proof));

      // Check all proofs.
      expect(proofsAsObjs).to.be.eql([
        {
          spender: alice.address,
          from: bob.address,
          to: john.address,
          amount: BigNumber.from(100),
          blockNumber: BigNumber.from(blockNumber + 1),
          ref: 'A1'
        },
        {
          spender: alice.address,
          from: bob.address,
          to: john.address,
          amount: BigNumber.from(200),
          blockNumber: BigNumber.from(blockNumber + 2),
          ref: 'A2'
        },
        {
          spender: alice.address,
          from: bob.address,
          to: john.address,
          amount: BigNumber.from(300),
          blockNumber: BigNumber.from(blockNumber + 3),
          ref: 'A3'
        }
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

  describe('paginateTransferProofIndicesByInvolvee', async () => {
    beforeEach(async () => {
      let tokenAsItself = await impersonateDiamond<FastHistoryFacet>(history);

      // Add three transfers from bob to john performed by alice.
      await Promise.all(['A1', 'A2', 'A3'].map((value, index) => {
        return tokenAsItself.transfered(alice.address, bob.address, john.address, (index + 1) * 100, value);
      }));

      // Turn off impersonating the diamond.
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [history.address]);
    });

    it('returns a paginated list of addresses and cursor', async () => {
      const [proofs, nextCursor] = await history.paginateTransferProofIndicesByInvolvee(bob.address, 0, 5);

      // Expecting 3 proof indexes.
      expect(proofs).to.be.eql([
        BigNumber.from(0),
        BigNumber.from(1),
        BigNumber.from(2)
      ]);

      // Expect that the next cursor is 3.
      expect(nextCursor).to.be.eq(3);
    });
  });

  describe('transferProofByInvolveeCount', async () => {
    beforeEach(async () => {
      let tokenAsItself = await impersonateDiamond<FastHistoryFacet>(history);

      // Add three transfers from bob to john performed by alice.
      await Promise.all(['A1', 'A2'].map((value) => {
        return tokenAsItself.transfered(alice.address, bob.address, john.address, 100, value);
      }));

      // Turn off impersonating the diamond.
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [history.address]);
    });

    it('returns the count of the transfer proofs for a given address', async () => {
      const subject = await history.transferProofByInvolveeCount(bob.address);
      expect(subject).to.be.eq(2);
    });
  });
});
