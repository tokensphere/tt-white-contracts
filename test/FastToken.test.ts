import * as chai from 'chai';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { Spc, FastRegistry, FastAccess, FastToken, FastToken__factory, FastHistory } from '../typechain-types';
chai.use(smock.matchers);

// TODO: Test events.

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ERC20_TOKEN_NAME = 'Random FAST Token';
const ERC20_TOKEN_SYMBOL = 'RFT';
const ERC20_TOKEN_DECIMALS = 18;

describe('FastAccess', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    member: SignerWithAddress,
    governor: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    rob: SignerWithAddress,
    john: SignerWithAddress;
  let reg: FastRegistry;
  let tokenFactory: FastToken__factory;
  let access: FastAccess,
    governedAccess: FastAccess;
  let history: FastHistory;
  let token: FastToken,
    memberToken: FastToken,
    governedToken: FastToken,
    spcMemberToken: FastToken;

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, member, governor, alice, bob, rob, john] = await ethers.getSigners();
    // Deploy the libraries.
    const addressSetLib = await (await ethers.getContractFactory('AddressSetLib')).deploy();
    const paginationLib = await (await ethers.getContractFactory('PaginationLib')).deploy();
    // Deploy an SPC.
    const spcLibs = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address };
    const spcFactory = await ethers.getContractFactory('Spc', { libraries: spcLibs });
    const spc = await upgrades.deployProxy(spcFactory, [spcMember.address]) as Spc;

    // Create our Registry.
    const regFactory = await ethers.getContractFactory('FastRegistry');
    reg = await upgrades.deployProxy(regFactory, [spc.address]) as FastRegistry;

    // Create our access factory and contract.
    const accessLibs = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address };
    const accessFactory = await ethers.getContractFactory('FastAccess', { libraries: accessLibs });
    access = await upgrades.deployProxy(accessFactory, [reg.address, governor.address]) as FastAccess;
    governedAccess = await access.connect(governor);
    // Link the access contract with the registry.
    await reg.connect(spcMember).setAccessAddress(access.address);
    // Add a bunch of members.
    await Promise.all([member, alice, bob].map(async ({ address }) => governedAccess.addMember(address)));

    // Create our history factory and contract.
    const historyLibs = { PaginationLib: paginationLib.address };
    const historyFactory = await ethers.getContractFactory('FastHistory', { libraries: historyLibs });
    history = await upgrades.deployProxy(historyFactory, [reg.address]) as FastHistory;
    // Register the history contract with the registry.
    reg.connect(spcMember).setHistoryAddress(history.address);

    // Finally, create our token factory.
    tokenFactory = await ethers.getContractFactory('FastToken');
  });

  beforeEach(async () => {
    token = await upgrades.deployProxy(
      tokenFactory,
      [reg.address, ERC20_TOKEN_NAME, ERC20_TOKEN_SYMBOL, ERC20_TOKEN_DECIMALS, true]
    ) as FastToken;
    governedToken = token.connect(governor);
    memberToken = token.connect(member);
    spcMemberToken = token.connect(spcMember);
    await reg.connect(spcMember).setTokenAddress(token.address);
  });

  /// Public stuff.

  describe('initialize', async () => {
    it('keeps track of the Registry address', async () => {
      const subject = await token.reg();
      expect(subject).to.eq(reg.address);
    });

    it('keeps track of the ERC20 parameters and extra ones', async () => {
      const name = await token.name();
      expect(name).to.eq(ERC20_TOKEN_NAME);

      const symbol = await token.symbol();
      expect(symbol).to.eq(ERC20_TOKEN_SYMBOL);

      const decimals = await token.decimals();
      expect(decimals).to.eq(ERC20_TOKEN_DECIMALS);

      const transferCredits = await token.transferCredits();
      expect(transferCredits).to.eq(0);
    });
  });

  describe('setHasFixedSupply', async () => {
    it('requires SPC membership (anonymous)');
    it('requires SPC membership (member)');
    it('requires SPC membership (governor)');
    it('changes the state of the fixed supply flag');
  });

  describe('mint', async () => {
    let historyMock: FakeContract<FastHistory>;

    beforeEach(async () => {
      historyMock = await smock.fake('FastHistory');
      await reg.connect(spcMember).setHistoryAddress(historyMock.address);
    });

    afterEach(async () => {
      await reg.connect(spcMember).setHistoryAddress(history.address);
    });

    it('requires SPC membership (anonymous)', async () => {
      const subject = token.mint(5_000, 'Attempt 1');
      await expect(subject).to.have.revertedWith('Missing SPC membership');
    });

    it('requires SPC membership (member)', async () => {
      const subject = token.connect(alice).mint(5_000, 'Attempt 1');
      await expect(subject).to.have.revertedWith('Missing SPC membership');
    });

    it('requires SPC membership (governor)', async () => {
      const subject = governedToken.mint(5_000, 'Attempt 1');
      await expect(subject).to.have.revertedWith('Missing SPC membership');
    });

    describe('with fixed supply', async () => {
      it('is allowed only once', async () => {
        await spcMemberToken.mint(1_000_000, 'Attempt 1');
        const subject = spcMemberToken.mint(1_000_000, 'Attempt 2');
        await expect(subject).to.have.revertedWith('Minting not possible at this time');
      });
    });

    describe('with continuous supply', async () => {
      beforeEach(async () => {
        await token.connect(spcMember).setHasFixedSupply(false);
      });

      it('is allowed more than once', async () => {
        await spcMemberToken.mint(1_000_000, 'Attempt 1');
        await spcMemberToken.mint(1_000_000, 'Attempt 2');
        const subject = await token.totalSupply();
        expect(subject).to.eq(2_000_000)
      });
    });

    it('delegates to the history contract', async () => {
      await spcMemberToken.mint(5_000, 'Attempt 1');
      const args = historyMock.addMintingProof.getCall(0).args;
      expect(args[0]).to.eq(5_000);
      expect(args[1]).to.eq('Attempt 1');
    });

    it('adds the minted tokens to the zero address', async () => {
      await spcMemberToken.mint(3_000, 'Attempt 1');
      const subject = await token.balanceOf(ZERO_ADDRESS);
      expect(subject).to.eq(3_000);
    });

    it('adds the minted tokens to the total supply', async () => {
      await spcMemberToken.mint(3_000, 'Attempt 1');
      const subject = await token.totalSupply();
      expect(subject).to.eq(3_000);
    });
  });

  /// Tranfer Credit management.

  describe('addTransferCredits', async () => {
    it('requires SPC membership (anonymous)', async () => {
      const subject = token.addTransferCredits(10);
      await expect(subject).to.have.revertedWith('Missing SPC membership');
    });

    it('requires SPC membership (member)', async () => {
      const subject = memberToken.addTransferCredits(10);
      await expect(subject).to.have.revertedWith('Missing SPC membership');
    });

    it('requires SPC membership (governor)', async () => {
      const subject = governedToken.addTransferCredits(10);
      await expect(subject).to.have.revertedWith('Missing SPC membership');
    });

    it('accumulates the credits to the existing transfer credits', async () => {
      await Promise.all([10, 20, 30, 40].map(async (value) =>
        spcMemberToken.addTransferCredits(value)
      ));
      expect(await token.transferCredits()).to.eq(100);
    });
  });

  describe('drainTransferCredits', async () => {
    it('requires SPC membership (anonymous)', async () => {
      const subject = token.drainTransferCredits();
      await expect(subject).to.have.revertedWith('Missing SPC membership');
    });

    it('requires SPC membership (member)', async () => {
      const subject = memberToken.drainTransferCredits();
      await expect(subject).to.have.revertedWith('Missing SPC membership');
    });

    it('requires SPC membership (governor)', async () => {
      const subject = governedToken.drainTransferCredits();
      await expect(subject).to.have.revertedWith('Missing SPC membership');
    });

    it('sets the credit amount to zero', async () => {
      await spcMemberToken.addTransferCredits(100);
      await spcMemberToken.drainTransferCredits();
      expect(await token.transferCredits()).to.eq(0);
    });
  });

  /// ERC20 implementation.

  describe('ERC20', async () => {
    beforeEach(async () => {
      // Mint a few tokens and raise the transfer credits.
      await Promise.all([
        spcMemberToken.mint(1_000_000, 'ERC20 Tests'),
        spcMemberToken.addTransferCredits(1_000_000)
      ]);
      // Transfer tokens from address zero to alice and bob.
      await Promise.all([alice, bob].map(
        async ({ address }) => governedToken.transferFrom(ZERO_ADDRESS, address, 100_000)
      ));
    });

    describe('balanceOf', async () => {
      it('returns the amount of tokens at a given address', async () => {
        const subject = await token.balanceOf(alice.address);
        expect(subject).to.eq(100_000);
      });
    });

    describe('transfer', async () => {
      let historyMock: FakeContract<FastHistory>;

      beforeEach(async () => {
        historyMock = await smock.fake('FastHistory');
        reg.connect(spcMember).setHistoryAddress(historyMock.address);
      });

      afterEach(async () => {
        reg.connect(spcMember).setHistoryAddress(history.address);
      });

      it('requires sender membership', async () => {
        const subject = token.transfer(bob.address, 100);
        await expect(subject).to.have.revertedWith('Missing sender membership');
      });

      it('requires recipient membership', async () => {
        const subject = token.connect(alice).transfer(john.address, 100);
        await expect(subject).to.have.revertedWith('Missing recipient membership');
      });

      it('requires sufficient funds', async () => {
        const subject = memberToken.transfer(alice.address, 100_001);
        await expect(subject).to.have.revertedWith('Insuficient funds');
      });

      it('requires sufficient transfer credits');
      it('does not require transfer credits when funds are move from the zero address');

      it('transfers to the given wallet address', async () => {
        const subject = () => token.connect(alice).transfer(bob.address, 1_000);
        await expect(subject).to.changeTokenBalances(token, [alice, bob], [-1_000, 1_000]);
      });

      it('delegates to the history contract', async () => {
        await token.connect(alice).transfer(bob.address, 123)
        const args = historyMock.addTransferProof.getCall(0).args;
        expect(args[0]).to.eq(alice.address);
        expect(args[1]).to.eq(alice.address);
        expect(args[2]).to.eq(bob.address);
        expect(args[3]).to.eq(123);
        expect(args[4]).to.eq('Unspecified - via ERC20');
      });
    });

    describe('transferWithRef', async () => {
      let historyMock: FakeContract<FastHistory>;

      beforeEach(async () => {
        historyMock = await smock.fake('FastHistory');
        reg.connect(spcMember).setHistoryAddress(historyMock.address);
      });

      afterEach(async () => {
        reg.connect(spcMember).setHistoryAddress(history.address);
      });

      it('requires sender membership', async () => {
        const subject = token.transferWithRef(bob.address, 100, 'Because I am not a member');
        await expect(subject).to.have.revertedWith('Missing sender membership');
      });

      it('requires recipient membership', async () => {
        const subject = token.connect(alice).transferWithRef(john.address, 100, 'Because you are not a member');
        await expect(subject).to.have.revertedWith('Missing recipient membership');
      });

      it('requires sufficient funds', async () => {
        const subject = memberToken.transferWithRef(alice.address, 100_001, 'Because I cannot afford it');
        await expect(subject).to.have.revertedWith('Insuficient funds');
      });

      it('transfers to the given wallet address', async () => {
        const subject = () => token.connect(alice).transferWithRef(bob.address, 1_000, 'Because I am rich');
        await expect(subject).to.changeTokenBalances(token, [alice, bob], [-1_000, 1_000]);
      });

      it('delegates to the history contract', async () => {
        await token.connect(alice).transferWithRef(bob.address, 123, 'Because I can')
        const args = historyMock.addTransferProof.getCall(0).args;
        expect(args[0]).to.eq(alice.address);
        expect(args[1]).to.eq(alice.address);
        expect(args[2]).to.eq(bob.address);
        expect(args[3]).to.eq(123);
        expect(args[4]).to.eq('Because I can');
      });
    });

    describe('allowance', async () => {
      it('does not require any particular rights');
      it('returns the allowance for a given member');
      it('always covers address zero for governors');
    });

    describe('approve', async () => {
      it('adds an allowance with the correct parameters');
    });

    describe('transferFrom', async () => {
      it('NEEDS MORE TESTS');
    });

    describe('transferFromWithRef', async () => {
      it('NEEDS MORE TESTS');
    });
  });

  /// ERC1404 implementation.

  describe('detectTransferRestriction', async () => {
    it('NEEDS MORE TESTS');
  });

  describe('messageForTransferRestriction', async () => {
    it('NEEDS MORE TESTS');
  });
});
