import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Spc__factory, Spc, FastRegistry } from '../typechain-types';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { toHexString } from '../src/utils';
import { negNine, negNinety, negOneHundred, negTen, negTwo, nine, ninety, one, oneHundred, oneMilion, ten, two } from './utils';

// TODO: Test events.

describe('Spc', () => {
  let
    spcMember: SignerWithAddress,
    bob: SignerWithAddress,
    alice: SignerWithAddress;
  let spcFactory: Spc__factory;
  let spc: Spc;
  let spcMemberSpc: Spc;

  before(async () => {
    // TODO: Replace most of this setup with mocks if possible.
    // Keep track of a few signers.
    [/*deployer*/, spcMember, bob, alice] = await ethers.getSigners();
    // Deploy our libraries.
    const addressSetLib = await (await ethers.getContractFactory('AddressSetLib')).deploy();
    const paginationLib = await (await ethers.getContractFactory('PaginationLib')).deploy();
    const helpersLib = await (await ethers.getContractFactory('HelpersLib')).deploy();
    // We can now cache a ready-to-use SPC factory.
    const spcLibs = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address, HelpersLib: helpersLib.address };
    spcFactory = await ethers.getContractFactory('Spc', { libraries: spcLibs });
  });

  beforeEach(async () => {
    spc = await upgrades.deployProxy(spcFactory, [spcMember.address]) as Spc;
    spcMemberSpc = spc.connect(spcMember);
    // Provision the SPC with a load of eth.
    await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(oneMilion)]);
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
      await expect(subject).to.be.revertedWith('Missing attached ETH');
    });

    it('is payable and keeps the attached Eth', async () => {
      const subject = async () => await spc.provisionWithEth({ value: ninety });
      await expect(subject).to.have.changeEtherBalance(spc, ninety);
    });
  });

  describe('drainEth', async () => {
    it('requires SPC membership', async () => {
      const subject = spc.drainEth();
      await expect(subject).to.be.revertedWith('Missing SPC membership');
    });

    it('transfers all the locked Eth to the caller', async () => {
      // Provision the SPC account with a lot of Eth.
      await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(oneHundred)]);
      // Do it!
      const subject = async () => await spcMemberSpc.drainEth();
      await expect(subject).to.changeEtherBalances([spc, spcMember], [negOneHundred, oneHundred]);
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
      await spcMemberSpc.addMember(bob.address);
      await spcMemberSpc.addMember(alice.address);

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
      await spcMemberSpc.addMember(bob.address);
      const subject = await spc.isMember(bob.address);
      expect(subject).to.eq(true);
    });

    it('does not add the same member twice', async () => {
      const subject = spcMemberSpc.addMember(spcMember.address);
      await expect(subject).to.be.revertedWith('Address already in set');
    });

    it('provisions the member with 10 Eth', async () => {
      await ethers.provider.send("hardhat_setBalance", [bob.address, '0x0']);
      // Do it!
      const subject = async () => await spcMemberSpc.addMember(bob.address);
      // Check balances.
      await expect(subject).to.changeEtherBalances([spc, bob], [negTen, ten]);
    });

    it('only tops-up the member if they already have eth', async () => {
      await ethers.provider.send("hardhat_setBalance", [bob.address, toHexString(one)]);
      // Do it!
      const subject = async () => await spcMemberSpc.addMember(bob.address);
      // Check balances.
      await expect(subject).to.changeEtherBalances([spc, bob], [negNine, nine]);
    });

    it('only provisions the member up to the available balance', async () => {
      await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(two)]);
      await ethers.provider.send("hardhat_setBalance", [bob.address, '0x0']);
      // Do it!
      const subject = async () => await spcMemberSpc.addMember(bob.address);
      // Check balances.
      await expect(subject).to.changeEtherBalances([spc, bob], [negTwo, two]);
    });
  });

  describe('removeMember', async () => {
    beforeEach(async () => {
      await spcMemberSpc.addMember(bob.address);
    });

    it('requires that the sender is a member', async () => {
      const subject = spc.removeMember(bob.address);
      await expect(subject).to.be.revertedWith('Missing SPC membership');
    });

    it('removes the member from the list', async () => {
      await spcMemberSpc.removeMember(bob.address);
      const subject = await spc.isMember(bob.address);
      expect(subject).to.eq(false);
    });

    it('does nothing if the member is not in the list', async () => {
      const subject = spcMemberSpc.removeMember(alice.address);
      await expect(subject).to.be.revertedWith('Address does not exist in set');
    });
  });

  /// FAST management stuff.

  describe('registerFastRegistry', async () => {
    let reg: FakeContract<FastRegistry>;

    beforeEach(async () => {
      // Set up a token mock.
      const token = await smock.fake('FastToken');
      // Make sure
      token.symbol.returns('FST');

      // Set up a mock registry.
      reg = await smock.fake('FastRegistry');
      // Make sure that the registry can return the address of our tocken mock.
      reg.token.returns(token.address);
    });

    it('requires SPC membership', async () => {
      const subject = spc.registerFastRegistry(reg.address);
      await expect(subject).to.have.revertedWith('Missing SPC membership');
    });

    it('forbids adding two FASTS with the same symbol', async () => {
      await spcMemberSpc.registerFastRegistry(reg.address);
      const subject = spcMemberSpc.registerFastRegistry(reg.address)
      await expect(subject).to.be.revertedWith('Symbol already taken');
    });

    it('adds the registry address to the list of registries');

    it('keeps track of the symbol');

    it('provisions the registry with 100 Eth', async () => {
      await ethers.provider.send("hardhat_setBalance", [reg.address, '0x0']);
      // Do it!
      const subject = async () => await spcMemberSpc.registerFastRegistry(reg.address);
      // Check balances.
      await expect(subject).to.changeEtherBalances([spc, reg], [negOneHundred, oneHundred]);
    });

    it('only tops-up the registry if it already has eth', async () => {
      await ethers.provider.send("hardhat_setBalance", [reg.address, toHexString(ten)]);
      // Do it!
      const subject = async () => await spcMemberSpc.registerFastRegistry(reg.address);
      // Check balances.
      await expect(subject).to.changeEtherBalances([spc, reg], [negNinety, ninety]);
    });

    it('only provisions the registry up to the available balance', async () => {
      await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(two)]);
      await ethers.provider.send("hardhat_setBalance", [reg.address, '0x0']);
      // Do it!
      const subject = async () => await spcMemberSpc.registerFastRegistry(reg.address);
      // Check balances.
      await expect(subject).to.changeEtherBalances([spc, reg], [negTwo, two]);
    });
  });

  describe('fastRegistryCount', async () => {
    it('returns the registry count', async () => {
      // Register a few token mocks.
      const fixture = ['FS1', 'FS2', 'FS3'];
      await Promise.all(
        fixture.map(async (symbol) => {
          // Set up a mock registry.
          const reg = await smock.fake('FastRegistry');
          const token = await smock.fake('FastToken');
          // Stub a few things.
          token.symbol.returns(symbol);
          reg.token.returns(token.address);
          // Register that new fast.
          return spcMemberSpc.registerFastRegistry(reg.address);
        })
      );
      const subject = await spc.fastRegistryCount();
      expect(subject).to.eq(fixture.length);
    });
  });

  describe('paginateFastRegistries', async () => {
    it('NEEDS MORE TESTS');
  });
});
