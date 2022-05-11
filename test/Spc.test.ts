import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Spc__factory, Spc, FastRegistry } from '../typechain-types';
import { FakeContract, smock } from '@defi-wonderland/smock';

// TODO: Test events.

describe('Spc', () => {
  let
    spcMember: SignerWithAddress,
    bob: SignerWithAddress,
    alice: SignerWithAddress;
  let spcFactory: Spc__factory;
  let spc: Spc;
  let governedSpc: Spc;

  before(async () => {
    // Keep track of a few signers.
    [/*deployer*/, spcMember, bob, alice] = await ethers.getSigners();
    // Deploy our libraries.
    const addressSetLib = await (await ethers.getContractFactory('AddressSetLib')).deploy();
    const paginationLib = await (await ethers.getContractFactory('PaginationLib')).deploy();
    // We can now cache a ready-to-use SPC factory.
    const spcLibs = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address };
    spcFactory = await ethers.getContractFactory('Spc', { libraries: spcLibs });
  });

  beforeEach(async () => {
    spc = await upgrades.deployProxy(spcFactory, [spcMember.address]) as Spc;
    governedSpc = spc.connect(spcMember);
  });

  describe('initialize', async () => {
    it('adds the given member when deployed', async () => {
      const subject = await spc.isMember(spcMember.address);
      expect(subject).to.eq(true);
    });
  });

  /// Eth provisioning stuff.

  describe('provisionWithEth', async () => {
    it('reverts when no Eth is attached', async () => {
      const subject = spc.provisionWithEth();
      await expect(subject).to.revertedWith('');
    });

    it('is payable and keeps the attached Eth', async () => {
      const amount = 42;
      await spc.provisionWithEth({ value: amount });
      const subject = await spc.provider.getBalance(spc.address);
      expect(subject).to.eq(amount);
    });
  });

  describe('drainEth', async () => {
    it('requires SPC membership', async () => {
      const subject = spc.drainEth();
      await expect(subject).to.revertedWith('Missing SPC membership');
    });

    it('transfers all the locked Eth to the caller', async () => {
      const amount = 42;
      await spc.provisionWithEth({ value: amount });
      const spcBalanceBefore = await spc.provider.getBalance(spc.address);
      const memberBalanceBefore = await spc.provider.getBalance(spcMember.address);
      await governedSpc.drainEth();
      const spcBalanceAfter = await spc.provider.getBalance(spc.address);
      const memberBalanceAfter = await spc.provider.getBalance(spcMember.address);

      // Check SPC contract balance.
      expect(spcBalanceBefore).to.eq(amount);
      expect(spcBalanceAfter).to.eq(0);

      // Check member balance.
      // TODO: Find a way to account for the gas spent...
      // expect(memberBalanceBefore.add(amount)).to.eq(memberBalanceAfter);
    });
  });

  /// Membership management.

  describe('memberCount', async () => {
    beforeEach(async () => {
      await spc.connect(spcMember).addMember(bob.address)
    });

    it('correctly counts members', async () => {
      const subject = await spc.memberCount();
      expect(subject).to.eq(2);
    });
  });

  describe('paginateMembers', async () => {
    it('returns pages of members', async () => {
      await governedSpc.addMember(bob.address);
      await governedSpc.addMember(alice.address);

      const [[g1, g2, g3],] = await spc.paginateMembers(0, 3);

      expect(g1).to.eq(spcMember.address);
      expect(g2).to.eq(bob.address);
      expect(g3).to.eq(alice.address);
    });
  });

  describe('isMember', async () => {
    it('returns true when the candidate is a member', async () => {
      const subject = await spc.isMember(spcMember.address);
      expect(subject).to.eq(true);
    });

    it('returns false when the candidate is not a member', async () => {
      const subject = await spc.isMember(bob.address);
      expect(subject).to.eq(false);
    });
  });

  describe('addMember', async () => {
    it('requires that the sender is a member', async () => {
      const subject = spc.addMember(alice.address);
      await expect(subject).to.be.revertedWith('Missing SPC membership');
    });

    it('adds the member to the list', async () => {
      await governedSpc.addMember(bob.address);
      const subject = await spc.isMember(bob.address);
      expect(subject).to.eq(true);
    });

    it('does not add the same member twice', async () => {
      const subject = governedSpc.addMember(spcMember.address);
      await expect(subject).to.be.revertedWith('Address already in set');
    });

    it('provisions the member with some Eth')
  });

  describe('removeMember', async () => {
    beforeEach(async () => {
      await governedSpc.addMember(bob.address);
    });

    it('requires that the sender is a member', async () => {
      const subject = spc.removeMember(bob.address);
      await expect(subject).to.be.revertedWith('Missing SPC membership');
    });

    it('removes the member from the list', async () => {
      await governedSpc.removeMember(bob.address);
      const subject = await spc.isMember(bob.address);
      expect(subject).to.eq(false);
    });

    it('does nothing if the member is not in the list', async () => {
      const subject = governedSpc.removeMember(alice.address);
      await expect(subject).to.be.revertedWith('Address does not exist in set');
    });
  });

  /// FAST management stuff.

  describe.only('registerFastRegistry', async () => {
    let reg: FastRegistry;

    beforeEach(async () => {
      const regFactory = await ethers.getContractFactory('FastRegistry');
      reg = await upgrades.deployProxy(regFactory, [spc.address]) as FastRegistry;
    });

    it('forbids adding two FASTS with the same symbol');

    it('adds the given address to the list of registries');

    it('provisions the registry address with some Eth', async () => {
      const balanceBefore = await reg.provider.getBalance(reg.address);
      await governedSpc.registerFastRegistry(reg.address);
      const balanceAfter = await reg.provider.getBalance(reg.address);

      console.log(balanceBefore);
      console.log(balanceAfter);
      // const args = reg.provisionWithEth.getCall(0).args;
      // expect(args[0]).to.eq(5_000);
      // expect(args[1]).to.eq('Attempt 1');
    });
  });

  describe('fastRegistryCount', async () => {
    it('returns the number of registries');
  });

  describe('paginateFastRegistries', async () => {
    it('NEEDS MORE TESTS');
  });
});
