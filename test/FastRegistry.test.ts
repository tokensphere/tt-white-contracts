import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Spc, FastRegistry__factory, FastRegistry } from '../typechain-types';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { toHexString } from '../src/utils';
import { negNinety, negOneHundred, negTwo, ninety, oneHundred, ten, two } from './utils';

describe('FastRegistry', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    alice: SignerWithAddress,
    access: SignerWithAddress,
    history: SignerWithAddress,
    token: SignerWithAddress;
  let spc: FakeContract<Spc>;
  let regFactory: FastRegistry__factory;
  let reg: FastRegistry;
  let spcMemberReg: FastRegistry;

  before(async () => {
    // Keep track of a few signers.
    [deployer, access, history, token, spcMember, alice] = await ethers.getSigners();
    // Deploy the libraries.
    const helpersLib = await (await ethers.getContractFactory('HelpersLib')).deploy();

    spc = await smock.fake('Spc');
    spc.isMember.returns(false);
    spc.isMember.whenCalledWith(spcMember.address).returns(true);

    // Cache our Registry factory.
    const regLibs = { HelpersLib: helpersLib.address };
    regFactory = await ethers.getContractFactory('FastRegistry', { libraries: regLibs });
  });

  beforeEach(async () => {
    reg = await upgrades.deployProxy(regFactory, [spc.address]) as FastRegistry;
    spcMemberReg = reg.connect(spcMember);
    // Register a few addresses in the registry.
    await Promise.all([
      spcMemberReg.setAccessAddress(access.address),
      spcMemberReg.setHistoryAddress(history.address),
      spcMemberReg.setTokenAddress(token.address)
    ]);
  });

  /// Public stuff.

  describe('initialize', async () => {
    it('keeps track of the SPC address', async () => {
      const subject = await reg.spc();
      expect(subject).to.eq(spc.address);
    });
  });

  /// Public member getters.

  describe('spc', async () => {
    it('returns the address of the SPC contract', async () => {
      const subject = await reg.spc();
      expect(subject).to.eq(spc.address);
    });
  });

  describe('access', async () => {
    it('returns the address of the access contract', async () => {
      const subject = await reg.access();
      expect(subject).to.eq(access.address);
    });
  });

  describe('history', async () => {
    it('returns the address of the history contract', async () => {
      const subject = await reg.history();
      expect(subject).to.eq(history.address);
    });
  });

  describe('token', async () => {
    it('returns the address of the token contract', async () => {
      const subject = await reg.token();
      expect(subject).to.eq(token.address);
    });
  });

  /// Eth provisioning stuff.

  describe('provisionWithEth', async () => {
    it('reverts when no Eth is attached', async () => {
      const subject = reg.provisionWithEth();
      await expect(subject).to.be.revertedWith('Missing attached ETH');
    });

    it('is payable and keeps the attached Eth', async () => {
      const subject = async () => await reg.provisionWithEth({ value: ninety });
      await expect(subject).to.have.changeEtherBalance(reg, ninety);
    });

    it('emits a EthReceived event', async () => {
      const subject = reg.provisionWithEth({ value: ninety });
      await expect(subject).to
        .emit(reg, 'EthReceived')
        .withArgs(deployer.address, ninety)
    });
  });

  describe('drainEth', async () => {
    it('requires SPC membership', async () => {
      const subject = reg.drainEth();
      await expect(subject).to.be.revertedWith('Missing SPC membership');
    });

    it('transfers all the locked Eth to the caller', async () => {
      // Provision the SPC account with 1_000_000 Eth.
      await ethers.provider.send("hardhat_setBalance", [reg.address, toHexString(oneHundred)]);
      // Do it!
      const subject = async () => await spcMemberReg.drainEth();
      await expect(subject).to.changeEtherBalances([reg, spcMember], [negOneHundred, oneHundred]);
    });

    it('emits a EthDrained event', async () => {
      // Provision the SPC account with 1_000_000 Eth.
      await ethers.provider.send("hardhat_setBalance", [reg.address, toHexString(oneHundred)]);
      // Do it!
      const subject = spcMemberReg.drainEth();
      await expect(subject).to
        .emit(reg, 'EthDrained')
        .withArgs(spcMember.address, oneHundred);
    });
  });

  describe('payUpTo', async () => {
    it('requires that the caller is access contract', async () => {
      const subject = reg.payUpTo(alice.address, oneHundred);
      await expect(subject).to.have.revertedWith('Cannot be called directly');
    });

    it('only tops-up the member if they already have eth', async () => {
      // Set alice's wallet to just one eth.
      await ethers.provider.send("hardhat_setBalance", [reg.address, toHexString(oneHundred)]);
      await ethers.provider.send("hardhat_setBalance", [alice.address, toHexString(ten)]);
      // Do it!
      await spcMemberReg.setAccessAddress(deployer.address);
      const subject = async () => await reg.payUpTo(alice.address, oneHundred);
      // Check balances.
      await expect(subject).to.changeEtherBalances([reg, alice], [negNinety, ninety]);
    });

    it('only provisions the member up to the available balance', async () => {
      // Put 200 wei in the SPC contract, 500 wei in alice's wallet.
      await ethers.provider.send("hardhat_setBalance", [reg.address, toHexString(two)]);
      await ethers.provider.send("hardhat_setBalance", [alice.address, '0x0']);
      // Do it!
      await spcMemberReg.setAccessAddress(deployer.address);
      const subject = async () => await reg.payUpTo(alice.address, ten);
      // Check balances.
      await expect(subject).to.changeEtherBalances([reg, alice], [negTwo, two]);
    });
  });

  /// Contract setters.

  describe('setAccessAddress', async () => {
    it('requires SPC membership', async () => {
      const subject = reg.setAccessAddress(alice.address);
      await expect(subject).to.be.revertedWith('Missing SPC membership');
    });

    it('keeps track of the FastAccess address', async () => {
      await spcMemberReg.setAccessAddress(alice.address);
      const subject = await reg.access();
      expect(subject).to.eq(alice.address);
    });

    it('emits a AccessAddressSet event', async () => {
      const subject = spcMemberReg.setAccessAddress(access.address);
      await expect(subject).to
        .emit(reg, 'AccessAddressSet')
        .withArgs(access.address)
    });
  });

  describe('setTokenAddress', async () => {
    it('requires SPC membership', async () => {
      const subject = reg.setTokenAddress(alice.address);
      await expect(subject).to.be.revertedWith('Missing SPC membership');
    });

    it('keeps track of the FastToken address', async () => {
      await spcMemberReg.setTokenAddress(alice.address);
      const subject = await reg.token();
      expect(subject).to.eq(alice.address);
    });

    it('emits a TokenAddressSet event', async () => {
      const subject = spcMemberReg.setTokenAddress(token.address);
      await expect(subject).to
        .emit(reg, 'TokenAddressSet')
        .withArgs(token.address)
    });
  });

  describe('setHistoryAddress', async () => {
    it('requires SPC membership', async () => {
      const subject = reg.setHistoryAddress(alice.address);
      await expect(subject).to.be.revertedWith('Missing SPC membership');
    });

    it('keeps track of the FastHistory address', async () => {
      await spcMemberReg.setHistoryAddress(alice.address);
      const subject = await reg.history();
      expect(subject).to.eq(alice.address);
    });

    it('emits a HistoryAddressSet event', async () => {
      const subject = spcMemberReg.setHistoryAddress(history.address);
      await expect(subject).to
        .emit(reg, 'HistoryAddressSet')
        .withArgs(history.address)
    });
  });
});
