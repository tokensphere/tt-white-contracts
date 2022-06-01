import * as chai from 'chai';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { Exchange__factory, Spc, Exchange } from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
chai.use(smock.matchers);

describe('Exchange', () => {
  let
    spcMember: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    rob: SignerWithAddress,
    john: SignerWithAddress;

  let spc: FakeContract<Spc>,
    exchangeFactory: Exchange__factory,
    exchange: Exchange,
    spcMemberExchange: Exchange;

  before(async () => {
    // Keep track of a few signers.
    [/*deployer*/, spcMember, alice, bob, rob, john] = await ethers.getSigners();

    // Deploy our libraries.
    const addressSetLib = await (await ethers.getContractFactory('LibAddressSet')).deploy();
    const paginationLib = await (await ethers.getContractFactory('LibPaginate')).deploy();

    // Create an SPC mock.
    spc = await smock.fake('Spc');

    const exchangeLibs = { LibAddressSet: addressSetLib.address, LibPaginate: paginationLib.address };
    exchangeFactory = await ethers.getContractFactory('Exchange', { libraries: exchangeLibs });
  });

  beforeEach(async () => {
    // Reset mocks.
    spc.isMember.reset();
    // Setup mocks.
    spc.isMember.returns(false);
    spc.isMember.whenCalledWith(spcMember.address).returns(true);

    // Spin up an Exchange contract.
    exchange = await upgrades.deployProxy(exchangeFactory, [spc.address]) as Exchange;
    spcMemberExchange = exchange.connect(spcMember);
  });

  describe('initialize', async () => {
    it('Keeps track of the SPC contract');
  });

  describe('IHasMembers', async () => {
    describe('addMember', async () => {
      it('requires governance (anonymous)', async () => {
        const subject = exchange.addMember(alice.address);
        await expect(subject).to.have
          .revertedWith('Missing SPC membership');
      });

      it('requires that the address is not a member yet', async () => {
        await spcMemberExchange.addMember(alice.address)
        const subject = spcMemberExchange.addMember(alice.address);
        await expect(subject).to.have
          .revertedWith('Address already in set');
      });

      it('adds the given address as a member', async () => {
        await spcMemberExchange.addMember(alice.address);
        const subject = await exchange.isMember(alice.address);
        expect(subject).to.eq(true);
      });

      it('delegates to the SPC for permissioning', async () => {
        await spcMemberExchange.addMember(alice.address);
        expect(spc.isMember).to.have.been
          .calledOnceWith(spcMember.address);
      });

      it('emits a MemberAdded event', async () => {
        const subject = spcMemberExchange.addMember(alice.address);
        await expect(subject).to
          .emit(exchange, 'MemberAdded')
          .withArgs(alice.address);
      });
    });

    describe('removeMember', async () => {
      beforeEach(async () => {
        // We want alice to be a member for these tests.
        await spcMemberExchange.addMember(alice.address);
      });

      it('requires governance (anonymous)', async () => {
        const subject = exchange.removeMember(alice.address);
        await expect(subject).to.have
          .revertedWith('Missing SPC membership');
      });

      it('requires that the address is an existing member', async () => {
        const subject = spcMemberExchange.removeMember(bob.address);
        await expect(subject).to.have
          .revertedWith('Address does not exist in set');
      });

      it('removes the given address as a member', async () => {
        await spcMemberExchange.removeMember(alice.address);
        const subject = await exchange.isMember(alice.address);
        expect(subject).to.eq(false);
      });

      it('emits a MemberRemoved event', async () => {
        const subject = spcMemberExchange.removeMember(alice.address);
        await expect(subject).to
          .emit(exchange, 'MemberRemoved')
          .withArgs(alice.address);
      });
    });

    describe('isMember', async () => {
      beforeEach(async () => {
        await spcMemberExchange.addMember(alice.address);
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
        await spcMemberExchange.addMember(alice.address);
      });

      it('returns the current count of members', async () => {
        const subject = await exchange.memberCount();
        expect(subject).to.eq(1);
      });
    });

    describe('paginateMembers', async () => {
      beforeEach(async () => {
        // Add 4 members.
        await spcMemberExchange.addMember(alice.address);
        await spcMemberExchange.addMember(bob.address);
        await spcMemberExchange.addMember(rob.address);
        await spcMemberExchange.addMember(john.address);
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
        expect(values).to.have.ordered.members([
          alice.address,
          bob.address,
          rob.address,
          john.address
        ]);
      });
    });
  });
});
