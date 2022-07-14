import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { Spc, Fast, ExchangeAccessFacet, Exchange } from '../../typechain';
import {
  REQUIRES_SPC_MEMBERSHIP,
  REQUIRES_NO_FAST_MEMBERSHIPS,
  REQUIRES_FAST_CONTRACT_CALLER,
  REQUIRES_EXCHANGE_ACTIVE_MEMBER,
  REQUIRES_EXCHANGE_DEACTIVATED_MEMBER,
  one
} from '../utils';
import { exchangeFixtureFunc } from '../fixtures/exchange';
import { toUnpaddedHexString } from '../../src/utils';
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

  const resetSpcMock = () => {
    spc.isMember.reset();
    spc.isMember.whenCalledWith(spcMember.address).returns(true);
    spc.isMember.returns(false);
  }

  const resetFastMock = () => {
    spc.isFastRegistered.reset();
    spc.isFastRegistered.whenCalledWith(fast.address).returns(true);
    spc.isFastRegistered.returns(false);
  }

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

    resetSpcMock();
    resetFastMock()
  });

  describe('IHasMembers', async () => {
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

    describe('addMember', async () => {
      it('requires SPC membership (anonymous)', async () => {
        const subject = access.addMember(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_SPC_MEMBERSHIP);
      });

      it('delegates to the SPC for permission', async () => {
        await spcMemberAccess.addMember(alice.address);
        expect(spc.isMember).to.be
          .calledOnceWith(spcMember.address);
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
        resetSpcMock();
      });

      it('requires SPC membership (anonymous)', async () => {
        const subject = exchange.removeMember(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_SPC_MEMBERSHIP);
      });

      it('delegates to the SPC for permission', async () => {
        await spcMemberAccess.removeMember(alice.address);
        expect(spc.isMember).to.be
          .calledOnceWith(spcMember.address);
      });

      it('requires that the address is an existing member - calls LibAddressSet', async () => {
        const subject = spcMemberAccess.removeMember(bob.address);
        await expect(subject).to.be
          .revertedWith('Address does not exist in set');
      });

      it('requires that the given member has no FAST memberships', async () => {
        await ethers.provider.send('hardhat_setBalance', [fast.address, toUnpaddedHexString(one)]);
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
  });

  // This should delegate to LibPaginate.addresses().
  describe('fastMemberships', async () => {
    it('returns an array of FASTs a given user belongs to along with a cursor');
    it('does not return FASTs the given user does not belong to');
  });

  describe('memberAddedToFast', async () => {
    it('requires the caller to be a registered FAST', async () => {
      const subject = exchange.memberAddedToFast(alice.address);
      await expect(subject).to.have.been
        .revertedWith(REQUIRES_FAST_CONTRACT_CALLER);
    });

    it('adds the given member to the FAST membership tracking data structure');
  });

  describe('memberRemovedFromFast', async () => {
    it('requires the caller to be a registered FAST', async () => {
      const subject = exchange.memberRemovedFromFast(alice.address);
      await expect(subject).to.have.been
        .revertedWith(REQUIRES_FAST_CONTRACT_CALLER);
    });

    it('removes the FAST contract from the list of Fast members');
  });

  describe('isMemberActive', async () => {
    beforeEach(async () => {
      // Deactivate Alice.
      await spcMemberAccess.deactivateMember(alice.address);
    });

    it('returns true when a member is active', async () => {
      const subject = await access.isMemberActive(bob.address);
      expect(subject).to.eq(true);
    });

    it('returns false when a member is deactived', async () => {
      const subject = await access.isMemberActive(alice.address);
      expect(subject).to.eq(false);
    });
  });

  describe('deactivateMember', async () => {
    it('requires the caller to be an SPC member', async () => {
      const subject = access.deactivateMember(alice.address);
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('adds the FAST member to the list of deactivated members', async () => {
      await spcMemberAccess.deactivateMember(alice.address);
      const subject = await access.isMemberActive(alice.address);
      expect(subject).to.eq(false);
    });

    it('emits a MemberDeactivated event', async () => {
      const subject = await spcMemberAccess.deactivateMember(alice.address);
      expect(subject).to
        .emit(access, 'MemberDeactivated')
        .withArgs(alice.address);
    });

    it('requires that a given member is not already deactivated', async () => {
      // Deactivate Alice.
      await spcMemberAccess.deactivateMember(alice.address);

      // Attempt to re-deactivate Alice.
      const subject = spcMemberAccess.deactivateMember(alice.address);
      await expect(subject).to.be
        .revertedWith(REQUIRES_EXCHANGE_ACTIVE_MEMBER);
    });
  });

  describe('activateMember', async () => {
    beforeEach(async () => {
      // Deactivate Alice.
      await spcMemberAccess.deactivateMember(alice.address);
    });

    it('requires the caller to be an SPC member', async () => {
      const subject = access.activateMember(alice.address);
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('removes the FAST member from the list of deactivated members', async () => {
      await spcMemberAccess.activateMember(alice.address);
      const subject = await access.isMemberActive(alice.address);
      expect(subject).to.eq(true);
    });

    it('emits a MemberActivated event', async () => {
      const subject = await spcMemberAccess.activateMember(alice.address);
      expect(subject).to
        .emit(access, 'MemberActivated')
        .withArgs(alice.address);
    });

    it('requires that a given member is currently deactivated', async () => {
      // Attempt to activate an already active member.
      const subject = spcMemberAccess.activateMember(bob.address);
      await expect(subject).to.be
        .revertedWith(REQUIRES_EXCHANGE_DEACTIVATED_MEMBER);
    });
  });
});
