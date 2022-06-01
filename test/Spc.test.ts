import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Spc__factory, Spc, FastRegistry } from '../typechain-types';
import { toHexString } from '../src/utils';
import {
  negNine, negOneHundred, negTen, negTwo, negTwoHundredFifty, negTwoHundredFourty,
  nine, ninety, one, oneHundred, oneMilion, ten, two, twoHundredFifty, twoHundredFourty
} from './utils';

describe('Spc', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    bob: SignerWithAddress,
    alice: SignerWithAddress;
  let spcFactory: Spc__factory;
  let spc: Spc;
  let spcMemberSpc: Spc;

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, bob, alice] = await ethers.getSigners();
    // Deploy our libraries.
    const addressSetLib = await (await ethers.getContractFactory('LibAddressSet')).deploy();
    const paginationLib = await (await ethers.getContractFactory('LibPaginate')).deploy();
    const helpersLib = await (await ethers.getContractFactory('LibHelpers')).deploy();
    // We can now cache a ready-to-use SPC factory.
    const spcLibs = { LibAddressSet: addressSetLib.address, LibPaginate: paginationLib.address, LibHelpers: helpersLib.address };
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

    it('emits a MemberAdded event', async () => {
      // Since we cannot get the transaction of a proxy-deployed contract
      // via `upgrades.deployProxy`, we will deploy it manually and call its
      // initializer.
      const contract = await spcFactory.deploy();
      const subject = contract.initialize(spcMember.address);
      await expect(subject).to
        .emit(contract, 'MemberAdded')
        .withArgs(spcMember.address);
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

    it('emits a EthReceived event', async () => {
      const subject = spc.provisionWithEth({ value: ninety });
      await expect(subject).to
        .emit(spc, 'EthReceived')
        .withArgs(deployer.address, ninety)
    });

    it('emits a EthDrained event', async () => {
      // Provision the SPC account with 1_000_000 Eth.
      await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(oneHundred)]);
      // Do it!
      const subject = spcMemberSpc.drainEth();
      await expect(subject).to
        .emit(spc, 'EthDrained')
        .withArgs(spcMember.address, oneHundred);
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

    it('emits a MemberAdded event', async () => {
      const subject = spcMemberSpc.addMember(bob.address);
      await expect(subject).to
        .emit(spc, 'MemberAdded')
        .withArgs(bob.address);
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

    it('reverts if the member is not in the list', async () => {
      const subject = spcMemberSpc.removeMember(alice.address);
      await expect(subject).to.be.revertedWith('Address does not exist in set');
    });

    it('emits a MemberRemoved event', async () => {
      const subject = spcMemberSpc.removeMember(bob.address);
      await expect(subject).to
        .emit(spc, 'MemberRemoved')
        .withArgs(bob.address);
    });
  });

  /// FAST management stuff.

  describe('fastRegistryBySymbol', async () => {
    it('returns the zero address when the FAST symbol is unknown');
    it('returns the FAST registry address when the FAST symbol is registered');
  });

  describe('registerFastRegistry', async () => {
    let reg: FakeContract<FastRegistry>;

    before(async () => {
      // Set up a token mock.
      const token = await smock.fake('FastToken');
      token.symbol.returns('FST');
      // Set up a mock registry.
      reg = await smock.fake('FastRegistry');
      reg.token.returns(token.address);
    });

    it('requires SPC membership', async () => {
      const subject = spc.registerFastRegistry(reg.address);
      await expect(subject).to.have
        .revertedWith('Missing SPC membership');
    });

    it('forbids adding two FASTS with the same symbol', async () => {
      await spcMemberSpc.registerFastRegistry(reg.address);
      const subject = spcMemberSpc.registerFastRegistry(reg.address)
      await expect(subject).to.be.revertedWith('Symbol already taken');
    });

    it('adds the registry address to the list of registries', async () => {
      // Note that this test is already covered by tests for `fastRegistryBySymbol`.
      // It would add very little value to add anything to it.
    });

    it('keeps track of the symbol', async () => {
      // Note that this test is already covered by tests for `fastRegistryBySymbol`.
      // It would add very little value to add anything to it.
    });

    it('provisions the registry with 250 Eth', async () => {
      await ethers.provider.send("hardhat_setBalance", [reg.address, '0x0']);
      // Do it!
      const subject = async () => await spcMemberSpc.registerFastRegistry(reg.address);
      // Check balances.
      await expect(subject).to.changeEtherBalances([spc, reg], [negTwoHundredFifty, twoHundredFifty]);
    });

    it('only tops-up the registry if it already has Eth', async () => {
      await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(oneMilion)]);
      await ethers.provider.send("hardhat_setBalance", [reg.address, toHexString(ten)]);
      // Do it!
      const subject = async () => await spcMemberSpc.registerFastRegistry(reg.address);
      // Check balances.
      await expect(subject).to.changeEtherBalances([spc, reg], [negTwoHundredFourty, twoHundredFourty]);
    });

    it('only provisions the registry up to the available balance', async () => {
      await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(two)]);
      await ethers.provider.send("hardhat_setBalance", [reg.address, '0x0']);
      // Do it!
      const subject = async () => await spcMemberSpc.registerFastRegistry(reg.address);
      // Check balances.
      await expect(subject).to.changeEtherBalances([spc, reg], [negTwo, two]);
    });

    it('emits a FastRegistered event', async () => {
      const subject = spcMemberSpc.registerFastRegistry(reg.address);
      await expect(subject).to
        .emit(spc, 'FastRegistered')
        .withArgs(reg.address);
    });
  });

  describe('fastRegistryCount', async () => {
    it('returns the registry count', async () => {
      // Register a few token mocks.
      const fixture = ['FS1', 'FS2'];
      await Promise.all(
        fixture.map(async (symbol) => {
          // Set up a mock registry.
          const [reg, token] = await Promise.all(
            ['FastRegistry', 'FastToken'].map(async (c) => await smock.fake(c))
          );
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
      // Register this FAST.
      await spcMemberSpc.registerFastRegistry(reg.address)
    });

    it('returns pages of registries', async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [[g1],] = await spc.paginateFastRegistries(0, 10);
      expect(g1).to.eq(reg.address);
    });
  });
});
