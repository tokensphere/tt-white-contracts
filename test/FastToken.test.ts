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

describe('FastToken', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    member: SignerWithAddress,
    governor: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    john: SignerWithAddress;
  let
    reg: FakeContract<FastRegistry>,
    tokenFactory: FastToken__factory,
    access: FakeContract<FastAccess>,
    history: FakeContract<FastHistory>,
    token: FastToken,
    memberToken: FastToken,
    governedToken: FastToken,
    spcMemberToken: FastToken;

  before(async () => {
    // TODO: Replace most of this setup with mocks if possible.
    // Keep track of a few signers.
    [deployer, spcMember, member, governor, alice, bob, john] = await ethers.getSigners();
    // Deploy the libraries.
    const paginationLib = await (await ethers.getContractFactory('PaginationLib')).deploy();

    // Deploy an SPC.
    // const spcLibs = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address, HelpersLib: helpersLib.address };
    // const spcFactory = await ethers.getContractFactory('Spc', { libraries: spcLibs });
    // const spc = await upgrades.deployProxy(spcFactory, [spcMember.address]) as Spc;

    reg = await smock.fake('FastRegistry');

    // Create an SPC mock.
    const spc = await smock.fake('Spc');
    // Configure SPC memberships with our SPC mock.
    spc.isMember.returns(false);
    spc.isMember.whenCalledWith(spcMember.address).returns(true);
    // Make sure our registry mock keeps track of the SPC mock address.
    reg.spc.returns(spc.address);

    // Create an access contract mock.
    access = await smock.fake('FastAccess');
    // Make sure the access mock can return the address of our registry.
    access.reg.returns(reg.address);
    // Configure governorship in our access mock.
    access.isGovernor.returns(false);
    access.isGovernor.whenCalledWith(governor.address).returns(true);
    // Configure membbership into our access contract.
    access.isMember.returns(false);
    [member, alice, bob].forEach(({ address }) => access.isMember.whenCalledWith(address).returns(true))
    // Make sure that our registry mock keeps track of the access mock address.
    reg.access.returns(access.address);

    // Create a history contract mock.
    history = await smock.fake('FastHistory');
    // Make sure that our registry mock is tracking the history mock address.
    reg.history.returns(history.address);

    // Finally, create our token factory.
    tokenFactory = await ethers.getContractFactory('FastToken');
  });

  beforeEach(async () => {
    const tokenParams = [reg.address, ERC20_TOKEN_NAME, ERC20_TOKEN_SYMBOL, ERC20_TOKEN_DECIMALS, true];
    token = await upgrades.deployProxy(tokenFactory, tokenParams) as FastToken;
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

  /// Public member getters.

  describe('reg', async () => {
    it('returns the registry address', async () => {
      const subject = await token.reg();
      expect(subject).to.eq(reg.address);
    });
  });

  describe('name', async () => {
    it('returns the name', async () => {
      const subject = await token.name();
      expect(subject).to.eq(ERC20_TOKEN_NAME);
    });
  });

  describe('symbol', async () => {
    it('returns the symbol', async () => {
      const subject = await token.symbol();
      expect(subject).to.eq(ERC20_TOKEN_SYMBOL);
    });
  });

  describe('decimals', async () => {
    it('returns the decimals', async () => {
      const subject = await token.decimals();
      expect(subject).to.eq(ERC20_TOKEN_DECIMALS);
    });
  });

  describe('totalSupply', async () => {
    it('returns the total supply', async () => {
      const subject = await token.totalSupply();
      expect(subject).to.eq(0);
    });
  });

  describe('transferCredits', async () => {
    it('returns the remaining transfer credits', async () => {
      const subject = await token.transferCredits();
      expect(subject).to.eq(0);
    });
  });

  describe('hasFixedSupply', async () => {
    it('returns the token fixed supply parameter', async () => {
      const subject = await token.hasFixedSupply();
      expect(subject).to.eq(true);
    });
  });

  /// Other stuff.

  describe('setHasFixedSupply', async () => {
    it('requires SPC membership (anonymous)');
    it('requires SPC membership (member)');
    it('requires SPC membership (governor)');
    it('changes the state of the fixed supply flag');
  });

  describe('mint', async () => {
    beforeEach(async () => {
      history.addMintingProof.reset();
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
        history.addMintingProof.reset();
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
      const args = history.addMintingProof.getCall(0).args as any;
      expect(args.amount).to.eq(5_000);
      expect(args.ref).to.eq('Attempt 1');
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

    it('emits a TransferCreditsAdded event');
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

    it('emits a TransferCreditsDrained event');
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
      beforeEach(async () => {
        history.addTransferProof.reset();
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
        const args = history.addTransferProof.getCall(0).args as any;
        expect(args.spender).to.eq(alice.address);
        expect(args.from).to.eq(alice.address);
        expect(args.to).to.eq(bob.address);
        expect(args.amount).to.eq(123);
        expect(args.ref).to.eq('Unspecified - via ERC20');
      });

      it('emits a IERC20.Transfer event');
    });

    describe('transferWithRef', async () => {
      beforeEach(async () => {
        history.addTransferProof.reset();
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
        const args = history.addTransferProof.getCall(0).args as any;
        expect(args.spender).to.eq(alice.address);
        expect(args.from).to.eq(alice.address);
        expect(args.to).to.eq(bob.address);
        expect(args.amount).to.eq(123);
        expect(args.ref).to.eq('Because I can');
      });

      it('emits a IERC20.Transfer event');
    });

    describe('allowance', async () => {
      it('does not require any particular rights');
      it('returns the allowance for a given member');
      it('always covers address zero for governors');
      it('NEEDS MORE TESTS');
    });

    describe('approve', async () => {
      it('adds an allowance with the correct parameters');
      it('emits a IERC20.Approval event')
      it('NEEDS MORE TESTS');
    });

    describe('transferFrom', async () => {
      it('NEEDS MORE TESTS');
      it('emits a IERC20.Transfer event');
    });

    describe('transferFromWithRef', async () => {
      it('NEEDS MORE TESTS');
      it('emits a IERC20.Transfer event');
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
