import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { Spc, Fast, ExchangeAccessFacet, Exchange } from '../../typechain';
import { REQUIRES_SPC_MEMBERSHIP, REQUIRES_NO_FAST_MEMBERSHIPS, REQUIRES_FAST_CONTRACT_CALLER, oneMillion } from '../utils';
import { exchangeFixtureFunc } from '../fixtures/exchange';
chai.use(solidity);
chai.use(smock.matchers);

describe('ExchangeAccessFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    rob: SignerWithAddress,
    john: SignerWithAddress;

  let spc: FakeContract<Spc>,
    fast: FakeContract<Fast>,
    exchange: Exchange,
    access: ExchangeAccessFacet,
    spcMemberAccess: ExchangeAccessFacet;

  const exchangeDeployFixture = deployments.createFixture(exchangeFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, alice, bob, rob, john] = await ethers.getSigners();
    // Mock SPC and Fast contracts.
    spc = await smock.fake('Spc');
    fast = await smock.fake('Fast');
  });

  beforeEach(async () => {
    await exchangeDeployFixture({
      opts: {
        name: 'ExchangeAccessFixture',
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ exchange } = args);
          access = await ethers.getContractAt<ExchangeAccessFacet>('ExchangeAccessFacet', exchange.address);
          spcMemberAccess = access.connect(spcMember);
        }
      },
      initWith: {
        spc: spc.address
      }
    });

    // Reset mocks.
    spc.isMember.reset();
    // Setup mocks.
    spc.isMember.whenCalledWith(spcMember.address).returns(true);
    spc.isMember.returns(false);
  });

  describe('IHasMembers', async () => {
    describe('addMember', async () => {
      it('requires governance (anonymous)', async () => {
        const subject = access.addMember(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_SPC_MEMBERSHIP);
      });

      it('requires that the address is not a member yet', async () => {
        await spcMemberAccess.addMember(alice.address)
        const subject = spcMemberAccess.addMember(alice.address);
        await expect(subject).to.be
          .revertedWith('Address already in set');
      });

      it('adds the given address as a member', async () => {
        await spcMemberAccess.addMember(alice.address);
        const subject = await exchange.isMember(alice.address);
        expect(subject).to.eq(true);
      });

      it('delegates to the SPC for permission', async () => {
        await spcMemberAccess.addMember(alice.address);
        expect(spc.isMember).to.be
          .calledOnceWith(spcMember.address);
      });

      it('emits a MemberAdded event', async () => {
        const subject = await spcMemberAccess.addMember(alice.address);
        await expect(subject).to
          .emit(exchange, 'MemberAdded')
          .withArgs(alice.address);
      });
    });

    describe('removeMember', async () => {
      beforeEach(async () => {
        // We want alice to be a member for these tests.
        await spcMemberAccess.addMember(alice.address);
      });

      it('requires governance (anonymous)', async () => {
        const subject = exchange.removeMember(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_SPC_MEMBERSHIP);
      });

      it('requires that the address is an existing member - calls LibAddressSet', async () => {
        const subject = spcMemberAccess.removeMember(bob.address);
        await expect(subject).to.be
          .revertedWith('Address does not exist in set');
      });

      it('requires that the address has no FAST memberships', async () => {
        // The fake FAST is registered.
        spc.isFastRegistered.reset();
        spc.isFastRegistered.whenCalledWith(fast.address).returns(true);
        spc.isFastRegistered.returns(false);

        // Add Alice to a fast via memberAddedToFast callback.
        await ethers
          .provider
          .send('hardhat_setBalance', [fast.address, oneMillion.toHexString()]);
        await exchange
          .connect(await ethers.getSigner(fast.address))
          .memberAddedToFast(alice.address);

        const subject = spcMemberAccess.removeMember(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_NO_FAST_MEMBERSHIPS);
      });

      it('removes the given address as a member', async () => {
        await spcMemberAccess.removeMember(alice.address);
        const subject = await exchange.isMember(alice.address);
        expect(subject).to.eq(false);
      });

      it('emits a MemberRemoved event', async () => {
        const subject = await spcMemberAccess.removeMember(alice.address);
        await expect(subject).to
          .emit(exchange, 'MemberRemoved')
          .withArgs(alice.address);
      });
    });

    describe('isMember', async () => {
      beforeEach(async () => {
        await spcMemberAccess.addMember(alice.address);
      });

      it('returns true when the address is a member', async () => {
        const subject = await exchange.isMember(alice.address);
        expect(subject).to.eq(true);
      });

      it('returns false when the address is not a member', async () => {
        const subject = await exchange.isMember(bob.address);
        expect(subject).to.eq(false);
      });
    });

    describe('memberCount', async () => {
      beforeEach(async () => {
        await spcMemberAccess.addMember(alice.address);
      });

      it('returns the current count of members', async () => {
        const subject = await exchange.memberCount();
        expect(subject).to.eq(1);
      });
    });

    describe('paginateMembers', async () => {
      beforeEach(async () => {
        // Add 4 members.
        await spcMemberAccess.addMember(alice.address);
        await spcMemberAccess.addMember(bob.address);
        await spcMemberAccess.addMember(rob.address);
        await spcMemberAccess.addMember(john.address);
      });

      it('returns the cursor to the next page', async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [, cursor] = await exchange.paginateMembers(0, 3);
        expect(cursor).to.eq(3);
      });

      it('does not crash when overflowing and returns the correct cursor', async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [, cursor] = await exchange.paginateMembers(1, 10);
        expect(cursor).to.eq(4);
      });

      it('returns the governors in the order they were added', async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [values,] = await exchange.paginateMembers(0, 5);
        expect(values).to.be
          .ordered.members([
            alice.address,
            bob.address,
            rob.address,
            john.address
          ]);
      });
    });
  });

  // This should delegate to LibPaginate.addresses().
  describe('fastMemberships', async () => {
    it('returns an array of addresses with a cursor');
  });

  describe('memberAddedToFast', async () => {
    beforeEach(async () => {
      // The fake FAST is not registered.
      spc.isFastRegistered.reset();
      spc.isFastRegistered.returns(false);
    });

    it('requires the calling FAST contract to be FastRegistered', async () => {
      // Override the balance for the FAST contract.
      await ethers.provider.send('hardhat_setBalance', [fast.address, oneMillion.toHexString()]);
      // Connect up.
      const exchangeAsFast = exchange.connect(await ethers.getSigner(fast.address));

      // Hit the memberAddedToFast callback.
      const subject = exchangeAsFast.memberAddedToFast(alice.address);
      await expect(subject).to.have.been
        .revertedWith(REQUIRES_FAST_CONTRACT_CALLER);
    });

    it('adds the calling FAST contract to the member list of the Fast');
  });

  describe('memberRemovedFromFast', async () => {
    it('requires the calling FAST contract to be FastRegistered');

    it('removes the FAST contract from the list of Fast members');
  });
});
