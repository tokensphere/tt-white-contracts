import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Spc__factory, Spc } from '../typechain-types';

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
    governedSpc = await spc.connect(spcMember);
  });

  describe('initializer', async () => {
    it('adds the given member when deployed', async () => {
      const subject = await spc.isMember(spcMember.address);
      expect(subject).to.eq(true);
    });
  });

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

  describe('fastTokenCount', async () => {
    it('returns the number of registered tokens');
  });

  describe('fastTokenAt', async () => {
    it('returns the token address registered at a given index');
  });

  describe('registerToken', async () => {
    it('adds the given address to the list of registered tokens');
  });
});
