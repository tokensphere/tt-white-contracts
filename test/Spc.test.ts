import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract, ContractFactory } from 'ethers';
import { ethers, upgrades } from 'hardhat';
import { Spc, Spc__factory } from '../typechain-types';

describe('Spc', () => {
  let governor: SignerWithAddress, bob: SignerWithAddress, alice: SignerWithAddress;
  let spcFactory: Spc__factory;
  let spc: Spc;

  before(async () => {
    // Keep track of a few signers.
    [/*deployer*/, governor, bob, alice] = await ethers.getSigners();
    // Deploy our libraries.
    const addressSetLib = await (await ethers.getContractFactory('AddressSetLib')).deploy();
    const paginationLib = await (await ethers.getContractFactory('PaginationLib')).deploy();
    // We can now cache a ready-to-use SPC factory.
    const spcLibs = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address };
    spcFactory = await ethers.getContractFactory('Spc', { libraries: spcLibs });
  });

  beforeEach(async () => {
    spc = await upgrades.deployProxy(spcFactory, [governor.address]) as Spc;
  });

  describe('initializer', async () => {
    it('adds the given governor when deployed', async () => {
      const subject = await spc.isGovernor(governor.address);
      expect(subject).to.eq(true);
    });
  });

  describe('governorCount', async () => {
    beforeEach(async () => {
      await spc.connect(governor).addGovernor(bob.address)
    });

    it('correctly counts governors', async () => {
      const subject = await spc.governorCount();
      expect(subject).to.eq(2);
    });
  });

  describe('paginateGovernors', async () => {
    it('returns pages of governors', async () => {
      const governedSpc = spc.connect(governor);
      await governedSpc.addGovernor(bob.address);
      await governedSpc.addGovernor(alice.address);

      const [[g1, g2, g3],] = await spc.paginateGovernors(0, 3);

      expect(g1).to.eq(governor.address);
      expect(g2).to.eq(bob.address);
      expect(g3).to.eq(alice.address);
    });
  });

  describe('isGovernor', async () => {
    it('returns true when the candidate is a governor', async () => {
      const subject = await spc.isGovernor(governor.address);
      expect(subject).to.eq(true);
    });

    it('returns false when the candidate is not a governor', async () => {
      const subject = await spc.isGovernor(bob.address);
      expect(subject).to.eq(false);
    });
  });

  describe('addGovernor', async () => {
    let governedSpc: Contract;

    beforeEach(async () => {
      governedSpc = await spc.connect(governor);
    });

    it('requires that the sender is a governor', async () => {
      const subject = spc.addGovernor(alice.address);
      await expect(subject).to.be.revertedWith('Missing governorship');
    });

    it('adds the governor to the list', async () => {
      await governedSpc.addGovernor(bob.address);
      const subject = await spc.isGovernor(bob.address);
      expect(subject).to.eq(true);
    });

    it('does not add the same governor twice', async () => {
      const subject = governedSpc.addGovernor(governor.address);
      await expect(subject).to.be.revertedWith('Address already in set');
    });
  });

  describe('removeGovernor', async () => {
    let governedSpc: Contract;

    beforeEach(async () => {
      governedSpc = spc.connect(governor);
      await governedSpc.addGovernor(bob.address);
    });

    it('requires that the sender is a governor', async () => {
      const subject = spc.removeGovernor(bob.address);
      await expect(subject).to.be.revertedWith('Missing governorship');
    });

    it('removes the governor from the list', async () => {
      await governedSpc.removeGovernor(bob.address);
      const subject = await spc.isGovernor(bob.address);
      expect(subject).to.eq(false);
    });

    it('does nothing if the governor is not in the list', async () => {
      const subject = governedSpc.removeGovernor(alice.address);
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
