import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { Spc, Exchange, Fast } from '../../typechain';
import { FastTokenFacet, FastTopFacet, FastHistoryFacet, FastTokenInternalFacet } from '../../typechain';
import { ZERO_ADDRESS, ZERO_ACCOUNT_MOCK, DEPLOYER_FACTORY_COMMON } from '../../src/utils';
import { FacetCutAction } from 'hardhat-deploy/dist/types';
import {
  INSUFFICIENT_ALLOWANCE,
  INSUFFICIENT_FUNDS,
  INSUFFICIENT_TRANSFER_CREDITS,
  INSUFFICIENT_TRANSFER_CREDITS_CODE,
  REQUIRES_CONTINUOUS_SUPPLY,
  INTERNAL_METHOD,
  REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT,
  REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT_CODE,
  REQUIRES_EXCHANGE_MEMBERSHIP,
  REQUIRES_EXCHANGE_MEMBERSHIP_CODE,
  REQUIRES_FAST_GOVERNORSHIP,
  REQUIRES_FAST_MEMBERSHIP,
  REQUIRES_FAST_MEMBERSHIP_CODE,
  REQUIRES_SPC_MEMBERSHIP,
  UNKNOWN_RESTRICTION_CODE,
  UNSUPPORTED_OPERATION,
  DEFAULT_TRANSFER_REFERENCE,
  one,
  sigsFromABI,
  setupDiamondFacet
} from '../utils';
chai.use(solidity);
chai.use(smock.matchers);

const FAST_FIXTURE_NAME = 'FastTokenFixture';
// TODO: We probably want to remove FastAccessFacet and replace it by a fakes...
//        It would require that no other facets use `LibFastAccess.data()...` but
//        instead use `FastAccessFacet(address(this))...`.
const FAST_FACETS = [
  'FastAccessFacet',
  'FastTokenFacet',
  'FastTokenInternalFacet'
];

// ERC20 parameters to deploy our fixtures.
const ERC20_TOKEN_NAME = 'Random FAST Token';
const ERC20_TOKEN_SYMBOL = 'RFT';
const ERC20_TOKEN_DECIMALS = BigNumber.from(18);

interface FastFixtureOpts {
  // Ops variables.
  deployer: string;
  governor: string;
  exchange: string;
  // Config.
  spc: string;
  name: string;
  symbol: string;
  decimals: BigNumber;
  hasFixedSupply: boolean;
  isSemiPublic: boolean;
}

describe('FastTokenFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    governor: SignerWithAddress,
    exchangeMember: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    john: SignerWithAddress,
    anonymous: SignerWithAddress;
  let
    spc: FakeContract<Spc>,
    exchange: FakeContract<Exchange>,
    fast: Fast,
    token: FastTokenFacet,
    topFacetFake: FakeContract<FastTopFacet>,
    historyFacetFake: FakeContract<FastHistoryFacet>,
    tokenInternalFacetFake: FakeContract<FastTokenInternalFacet>,
    frontendFacetFake: FakeContract<FastTokenInternalFacet>,
    governedToken: FastTokenFacet,
    spcMemberToken: FastTokenFacet;

  const fastDeployFixture = deployments.createFixture(async (hre, uOpts) => {
    const initOpts = uOpts as FastFixtureOpts;
    const { deployer, ...initFacetArgs } = initOpts;
    // Deploy the diamond.
    const deploy = await deployments.diamond.deploy(FAST_FIXTURE_NAME, {
      from: initOpts.deployer,
      owner: initOpts.deployer,
      facets: FAST_FACETS,
      execute: {
        contract: 'FastInitFacet',
        methodName: 'initialize',
        args: [initFacetArgs],
      },
      deterministicSalt: DEPLOYER_FACTORY_COMMON.salt
    });

    fast = await ethers.getContract<Fast>(FAST_FIXTURE_NAME);
    token = await ethers.getContract<FastTokenFacet>(FAST_FIXTURE_NAME);
    governedToken = token.connect(governor);
    spcMemberToken = token.connect(spcMember);

    // Set up a top facet fake and install it.
    topFacetFake = await smock.fake('FastTopFacet');
    await setupDiamondFacet(fast, topFacetFake, 'FastTopFacet', FacetCutAction.Add);
    // Set up our history facet fake and install it.
    historyFacetFake = await smock.fake('FastHistoryFacet');
    await setupDiamondFacet(fast, historyFacetFake, 'FastHistoryFacet', FacetCutAction.Add);
    // Set up our frontend facet fake and install it.
    frontendFacetFake = await smock.fake('FastFrontendFacet');
    await setupDiamondFacet(fast, frontendFacetFake, 'FastFrontendFacet', FacetCutAction.Add);
    // Create an internal facet fake, but don't install it yet, as we only
    // need it in certain tests while others need the real functionality.
    tokenInternalFacetFake = await smock.fake('FastTokenInternalFacet');

    // Add a few FAST members.
    const governedFast = fast.connect(governor);
    await Promise.all([alice, bob, john].map(
      async ({ address }) => governedFast.addMember(address))
    );
  });

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, governor, exchangeMember, alice, bob, john, anonymous] = await ethers.getSigners();
    // Mock an SPC and an Exchange contract.
    spc = await smock.fake('Spc');
    exchange = await smock.fake('Exchange');
    exchange.spcAddress.returns(spc.address);
  });

  beforeEach(async () => {
    // Reset mocks.
    spc.isMember.reset();
    exchange.isMember.reset();
    // Setup mocks.
    spc.isMember.whenCalledWith(spcMember.address).returns(true);
    spc.isMember.returns(false);
    await Promise.all(
      [exchangeMember, alice, bob, john].map(
        async ({ address }) => exchange.isMember.whenCalledWith(address).returns(true)
      )
    );
    exchange.isMember.returns(false);

    await fastDeployFixture({
      deployer: deployer.address,
      governor: governor.address,
      exchange: exchange.address,
      spc: spc.address,
      name: ERC20_TOKEN_NAME,
      symbol: ERC20_TOKEN_SYMBOL,
      decimals: ERC20_TOKEN_DECIMALS,
      hasFixedSupply: true,
      isSemiPublic: false
    });
  });

  /// Public stuff.

  describe('initialize', async () => {
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

  describe('setIsSemiPublic', async () => {
    it('requires SPC membership for the sender', async () => {
      const subject = token.setIsSemiPublic(true);
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('cannot revert an SPC to non-semi public once set', async () => {
      // Set as semi public.
      await spcMemberToken.setIsSemiPublic(true);
      // Attempt to revert to non-semi public.
      const subject = spcMemberToken.setIsSemiPublic(false);
      await expect(subject).to.be
        .revertedWith(UNSUPPORTED_OPERATION);
    });

    it('sets the required isSemiPublic flag on the token', async () => {
      await spcMemberToken.setIsSemiPublic(true);
      expect(await spcMemberToken.isSemiPublic()).to.be.true;
    });
  });

  describe('setHasFixedSupply', async () => {
    it('requires SPC membership (anonymous)', async () => {
      const subject = token.setHasFixedSupply(true);
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('requires SPC membership (member)', async () => {
      const subject = token.connect(alice).setHasFixedSupply(true);
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('requires SPC membership (governor)', async () => {
      const subject = governedToken.setHasFixedSupply(true);
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('toggles the status flag', async () => {
      // Toggle to true.
      await spcMemberToken.setHasFixedSupply(true);
      expect(await token.hasFixedSupply()).to.be.true;
      // Toggle to false.
      await spcMemberToken.setHasFixedSupply(false);
      expect(await token.hasFixedSupply()).to.be.false;
      // Toggle to true.
      await spcMemberToken.setHasFixedSupply(true);
      expect(await token.hasFixedSupply()).to.be.true;
    });
  });

  describe('mint', async () => {
    it('requires SPC membership (anonymous)', async () => {
      const subject = token.mint(5_000, 'Attempt 1');
      await expect(subject).to.have
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('requires SPC membership (member)', async () => {
      const subject = token.connect(alice).mint(5_000, 'Attempt 1');
      await expect(subject).to.have
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('requires SPC membership (governor)', async () => {
      const subject = governedToken.mint(5_000, 'Attempt 1');
      await expect(subject).to.have
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    describe('with fixed supply', async () => {
      it('is allowed only once', async () => {
        await spcMemberToken.mint(1_000_000, 'Attempt 1');
        const subject = spcMemberToken.mint(1_000_000, 'Attempt 2');
        await expect(subject).to.have
          .revertedWith(REQUIRES_CONTINUOUS_SUPPLY);
      });
    });

    describe('with continuous supply', async () => {
      beforeEach(async () => {
        await token.connect(spcMember).setHasFixedSupply(false);
      });

      it('is allowed more than once', async () => {
        const subject = () => Promise.all([
          spcMemberToken.mint(1_000_000, 'Attempt 1'),
          spcMemberToken.mint(1_000_000, 'Attempt 2')
        ]);
        await expect(subject).to
          .changeTokenBalance(token, ZERO_ACCOUNT_MOCK, 2_000_000);
      });
    });

    it('delegates to the history contract', async () => {
      historyFacetFake.minted.reset();
      await spcMemberToken.mint(5_000, 'Attempt 1');
      expect(historyFacetFake.minted).to.have.been
        .calledOnceWith(5_000, 'Attempt 1')
        .delegatedFrom(token.address);
    });

    it('adds the minted tokens to the zero address', async () => {
      await spcMemberToken.mint(3_000, 'Attempt 1');
      const subject = await token.balanceOf(ZERO_ADDRESS);
      expect(subject).to.eq(3_000);
    });

    it('does not impact total supply', async () => {
      await spcMemberToken.mint(3_000, 'Attempt 1');
      const subject = await token.totalSupply();
      expect(subject).to.eq(0);
    });

    it('emits a Minted event', async () => {
      const subject = spcMemberToken.mint(3_000, 'Attempt 1');
      await expect(subject).to
        .emit(token, 'Minted')
        .withArgs(3_000, 'Attempt 1');
    });
  });

  describe('burn', async () => {
    beforeEach(async () => {
      await spcMemberToken.setHasFixedSupply(false);
      await spcMemberToken.mint(100, 'A hundred mints');
    });

    it('requires SPC membership (anonymous)', async () => {
      const subject = token.burn(5, 'Burn baby burn');
      await expect(subject).to.have
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('requires SPC membership (member)', async () => {
      const subject = token.connect(alice).burn(5, 'Burn baby burn');
      await expect(subject).to.have
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('requires SPC membership (governor)', async () => {
      const subject = governedToken.burn(5, 'Burn baby burn');
      await expect(subject).to.have
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('requires that the supply is continuous', async () => {
      await spcMemberToken.setHasFixedSupply(true);
      const subject = spcMemberToken.burn(5, 'Burn baby burn')
      await expect(subject).to.have
        .revertedWith(REQUIRES_CONTINUOUS_SUPPLY);
    });

    it('requires that the zero address has enough funds', async () => {
      const subject = spcMemberToken.burn(101, 'Burn baby burn')
      await expect(subject).to.have
        .revertedWith(INSUFFICIENT_FUNDS);
    });

    it('removes tokens from the zero address', async () => {
      const subject = async () => spcMemberToken.burn(30, 'Burn baby burn')
      await expect(subject).to
        .changeTokenBalance(token, ZERO_ACCOUNT_MOCK, -30)
    });

    it('does not impact total supply', async () => {
      const totalSupplyBefore = await token.totalSupply();
      await spcMemberToken.burn(100, 'Burnidy burn');
      const subject = await token.totalSupply();
      expect(subject).to.eq(totalSupplyBefore);
    });

    it('delegates to the history contract', async () => {
      historyFacetFake.burnt.reset();
      await spcMemberToken.burn(50, 'It is hot');
      expect(historyFacetFake.burnt).to.have.been
        .calledOnceWith(50, 'It is hot')
        .delegatedFrom(token.address);
    });

    it('emits a Burnt event', async () => {
      const subject = spcMemberToken.burn(50, 'Feel the burn');
      await expect(subject).to
        .emit(token, 'Burnt')
        .withArgs(50, 'Feel the burn');
    });
  });

  /// Tranfer Credit management.

  describe('addTransferCredits', async () => {
    it('requires SPC membership (anonymous)', async () => {
      const subject = token.addTransferCredits(10);
      await expect(subject).to.have
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('requires SPC membership (member)', async () => {
      const subject = token.connect(alice).addTransferCredits(10);
      await expect(subject).to.have
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('requires SPC membership (governor)', async () => {
      const subject = governedToken.addTransferCredits(10);
      await expect(subject).to.have
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('accumulates the credits to the existing transfer credits', async () => {
      await Promise.all([10, 20, 30, 40].map(async (value) =>
        spcMemberToken.addTransferCredits(value)
      ));
      expect(await token.transferCredits()).to.eq(100);
    });

    it('emits a TransferCreditsAdded event', async () => {
      const subject = spcMemberToken.addTransferCredits(50);
      await expect(subject).to
        .emit(token, 'TransferCreditsAdded')
        .withArgs(spcMember.address, 50);
    });
  });

  describe('drainTransferCredits', async () => {
    it('requires SPC membership (anonymous)', async () => {
      const subject = token.drainTransferCredits();
      await expect(subject).to.have
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('requires SPC membership (member)', async () => {
      const subject = token.connect(alice).drainTransferCredits();
      await expect(subject).to.have
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('requires SPC membership (governor)', async () => {
      const subject = governedToken.drainTransferCredits();
      await expect(subject).to.have
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('sets the credit amount to zero', async () => {
      await spcMemberToken.addTransferCredits(100);
      await spcMemberToken.drainTransferCredits();
      expect(await token.transferCredits()).to.eq(0);
    });

    it('emits a TransferCreditsDrained event', async () => {
      const creditsBefore = await token.transferCredits();
      const subject = spcMemberToken.drainTransferCredits();
      await expect(subject).to
        .emit(token, 'TransferCreditsDrained')
        .withArgs(spcMember.address, creditsBefore);
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
        async ({ address }) => governedToken.transferFrom(ZERO_ADDRESS, address, 100)
      ));
    });

    describe('balanceOf', async () => {
      it('returns the amount of tokens at a given address', async () => {
        const subject = await token.balanceOf(alice.address);
        expect(subject).to.eq(100);
      });
    });

    describe('transfer', async () => {
      it('delegates to FastTokenInternalFacet', async () => {
        await setupDiamondFacet(fast, tokenInternalFacetFake, 'FastTokenInternalFacet', FacetCutAction.Replace);
        tokenInternalFacetFake.performTransfer.reset();

        // Expected passed arguments.
        const args = {
          spender: alice.address,
          from: alice.address,
          to: bob.address,
          amount: BigNumber.from(1),
          ref: DEFAULT_TRANSFER_REFERENCE
        };
        await token.connect(alice).transfer(args.to, args.amount);
        // Expect performTransfer to be called correctly.
        expect(tokenInternalFacetFake.performTransfer).to.have.been
          .calledOnceWith(args)
          .delegatedFrom(token.address);
      });
    });

    describe('transferWithRef', async () => {
      it('delegates to FastTokenInternalFacet', async () => {
        await setupDiamondFacet(fast, tokenInternalFacetFake, 'FastTokenInternalFacet', FacetCutAction.Replace);        // Expected passed arguments.
        tokenInternalFacetFake.performTransfer.reset();

        const args = {
          spender: alice.address,
          from: alice.address,
          to: bob.address,
          amount: BigNumber.from(1),
          ref: 'Some ref message'
        };
        await token.connect(alice).transferWithRef(args.to, args.amount, args.ref);
        // Expect performTransfer to be called correctly.
        expect(tokenInternalFacetFake.performTransfer).to.have.been
          .calledOnceWith(args)
          .delegatedFrom(token.address);
      });
    });

    describe('allowance', async () => {
      it('returns the allowance for a given member', async () => {
        // Let bob give allowance to alice.
        await token.connect(bob).approve(alice.address, 50);
        // Do it!
        const subject = await token.allowance(bob.address, alice.address);
        expect(subject).to.eq(50);
      });

      it('follows value at zero address for governors', async () => {
        let subject: BigNumber;
        // Make the token continuous supply.
        await spcMemberToken.setHasFixedSupply(false);
        // Check the balance.
        const allocated = await token.balanceOf(ZERO_ADDRESS);
        subject = await token.allowance(ZERO_ADDRESS, governor.address);
        expect(subject).to.eq(allocated);

        // Mint some more.
        spcMemberToken.mint(50, 'Adding some more');
        subject = await token.allowance(ZERO_ADDRESS, governor.address);
        expect(subject).to.eq(allocated.add(50));

      });
    });

    describe('approve', async () => {
      describe('when semi-public', async () => {
        it('requires sender membership or Exchange membership');
        it('requires recipient membership or Exchange membership');
      });

      describe('when private', async () => {
        it('requires sender membership (anonymous)');
        it('requires sender membership (Exchange member)');
        it('requires recipient membership (anonymous)');
        it('requires recipient membership (Exchange member)');
      });

      it('adds an allowance with the correct parameters', async () => {
        // Let alice give allowance to bob.
        await token.connect(alice).approve(bob.address, 50);
        // Do it!
        const subject = await token.allowance(alice.address, bob.address);
        expect(subject).to.eq(50);
      });

      it('stacks up new allowances', async () => {
        // Let alice give allowance to bob. twice
        await token.connect(alice).approve(bob.address, 10);
        await token.connect(alice).approve(bob.address, 20);
        const subject = await token.allowance(alice.address, bob.address);
        expect(subject).to.eq(30);
      });

      it('keeps track of given allowances', async () => {
        await token.connect(alice).approve(bob.address, 10);
        const [[a1], /*cursor*/] = await token.paginateAllowancesByOwner(alice.address, 0, 5);
        expect(a1).to.eq(bob.address);
      });

      it('keeps track of received allowances', async () => {
        await token.connect(alice).approve(bob.address, 10);
        const [[a1], /*cursor*/] = await token.paginateAllowancesBySpender(bob.address, 0, 5);
        expect(a1).to.eq(alice.address);
      });

      it('emits an Approval event', async () => {
        // Let alice give allowance to bob.
        const subject = token.connect(alice).approve(bob.address, 60);
        // Note that we're observing the fast diamond, not just the token facet.
        // This is because the event is not emitted by the token facet itself.
        await expect(subject).to
          .emit(fast, 'Approval')
          .withArgs(alice.address, bob.address, 60)
      });
    });

    describe('disapprove', async () => {
      beforeEach(async () => {
        // Let bob give john an allowance.
        await token.connect(bob).approve(john.address, 15);
      });

      describe('when semi-public', async () => {
        it('requires sender membership or Exchange membership');
        it('requires recipient membership or Exchange membership');
      });

      describe('when private', async () => {
        it('requires sender membership (anonymous)');
        it('requires sender membership (Exchange member)');
        it('requires recipient membership (anonymous)');
        it('requires recipient membership (Exchange member)');
      });

      it('sets the allowance to zero', async () => {
        await token.connect(bob).disapprove(john.address);
        const subject = await token.allowance(bob.address, john.address);
        expect(subject).to.eq(0);
      });

      it('removes the spender received allowance');
      it('removes the original given allowance');

      it('emits a Disapproval event', async () => {
        const subject = token.connect(bob).disapprove(john.address);
        // Note that we're observing the fast diamond, not just the token facet.
        // This is because the event is not emitted by the token facet itself.
        await expect(subject).to
          .emit(fast, 'Disapproval')
          .withArgs(bob.address, john.address);
      });
    });

    describe('transferFrom', async () => {
      it('delegates to FastTokenInternalFacet', async () => {
        await setupDiamondFacet(fast, tokenInternalFacetFake, 'FastTokenInternalFacet', FacetCutAction.Replace);        // Expected passed arguments.
        tokenInternalFacetFake.performTransfer.reset();

        const args = {
          spender: alice.address,
          from: alice.address,
          to: bob.address,
          amount: BigNumber.from(1),
          ref: DEFAULT_TRANSFER_REFERENCE
        };
        await token.connect(alice).transferFrom(args.from, args.to, args.amount);
        // Expect performTransfer to be called correctly.
        expect(tokenInternalFacetFake.performTransfer).to.have.been
          .calledOnceWith(args)
          .delegatedFrom(token.address);
      });
    });

    describe('transferFromWithRef', async () => {
      beforeEach(async () => {
        // Let bob give allowance to john.
        await token.connect(bob).approve(john.address, 150);
      });

      it('delegates to FastTokenInternalFacet', async () => {
        await setupDiamondFacet(fast, tokenInternalFacetFake, 'FastTokenInternalFacet', FacetCutAction.Replace);        // Expected passed arguments.
        tokenInternalFacetFake.performTransfer.reset();

        const args = {
          spender: alice.address,
          from: alice.address,
          to: bob.address,
          amount: BigNumber.from(1),
          ref: 'Some useful ref'
        };
        await token.connect(alice).transferFromWithRef(args.from, args.to, args.amount, args.ref);
        // Expect performTransfer to be called correctly.
        expect(tokenInternalFacetFake.performTransfer).to.have.been
          .calledOnceWith(args)
          .delegatedFrom(token.address);
      });

      describe('when semi-public', async () => {
        beforeEach(async () => {
          spcMemberToken.setIsSemiPublic(true);
        });

        it('requires sender membership or Exchange membership');
        it('requires recipient membership or Exchange membership');
        it('allows exchange members to transact');
      });

      describe('when private', async () => {
        it('requires sender membership (anonymous)');
        it('requires sender membership (Exchange member)');

        it('requires recipient membership (anonymous)', async () => {
          const subject = token.connect(john).transferFromWithRef(bob.address, anonymous.address, 100, 'One');
          await expect(subject).to.have
            .revertedWith(REQUIRES_FAST_MEMBERSHIP);
        });

        it('requires recipient membership (Exchange member)');
      });

      it('requires that the sender and recipient are different', async () => {
        const subject = token.connect(john).transferFromWithRef(bob.address, bob.address, 100, 'No!')
        await expect(subject).to.have
          .revertedWith(REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT);
      });

      it('requires sufficient funds', async () => {
        const subject = token.connect(john).transferFromWithRef(bob.address, alice.address, 101, 'Two');
        await expect(subject).to.have
          .revertedWith(INSUFFICIENT_FUNDS);
      });

      it('requires sufficient transfer credits', async () => {
        // Drain all credits, and provision some more.
        await spcMemberToken.drainTransferCredits();
        await spcMemberToken.addTransferCredits(90);
        // Do it!
        const subject = token.connect(john).transferFromWithRef(bob.address, alice.address, 100, 'Three');
        await expect(subject).to.be
          .revertedWith(INSUFFICIENT_TRANSFER_CREDITS);
      });

      it('transfers from / to the given wallet address', async () => {
        const subject = () => token.connect(john).transferFromWithRef(bob.address, alice.address, 100, 'Four');
        await expect(subject).to
          .changeTokenBalances(token, [bob, alice], [-100, 100]);
      });

      it('delegates to the history contract', async () => {
        historyFacetFake.transfered.reset();
        await token.connect(john).transferFromWithRef(bob.address, alice.address, 12, 'Five')
        expect(historyFacetFake.transfered).to.have.been
          .calledOnceWith(john.address, bob.address, alice.address, 12, 'Five')
          .delegatedFrom(token.address)
      });

      it('decreases total supply when transferring to the zero address', async () => {
        // Keep total supply.
        const supplyBefore = await token.totalSupply();
        // Do it!
        await token.connect(john).transferFromWithRef(bob.address, ZERO_ADDRESS, 100, 'Five and a half?');
        // Check that total supply decreased.
        expect(await token.totalSupply()).to.eql(supplyBefore.add(-100));
      });

      it('emits a IERC20.Transfer event', async () => {
        const subject = token.connect(john).transferFromWithRef(bob.address, alice.address, 98, 'Six');
        // Note that we're observing the fast diamond, not just the token facet.
        // This is because the event is not emitted by the token facet itself.
        await expect(subject).to
          .emit(fast, 'Transfer')
          .withArgs(bob.address, alice.address, 98);
      });

      // `transferFrom` specific!

      it('requires that there is enough allowance', async () => {
        const subject = token.connect(bob).transferFromWithRef(alice.address, john.address, 100, 'Seven');
        await expect(subject).to.have
          .revertedWith(INSUFFICIENT_ALLOWANCE);
      });

      it('allows non-members to transact on behalf of members', async () => {
        // Let bob give allowance to anonymous.
        await token.connect(bob).approve(anonymous.address, 150);
        // Do it!
        const subject = () => token.connect(anonymous).transferFromWithRef(bob.address, alice.address, 100, 'Eight');
        await expect(subject).to
          .changeTokenBalances(token, [bob, alice], [-100, 100]);
      });

      it('increases total supply when transferring from the zero address', async () => {
        // Keep track of total supply.
        const supplyBefore = await token.totalSupply();
        // Do it!
        await governedToken.transferFromWithRef(ZERO_ADDRESS, alice.address, 100, 'Eight and a half?');
        // Check that total supply increased.
        expect(await token.totalSupply()).to.eql(supplyBefore.add(100));
      });

      it('requires that zero address can only be spent from as a governor (SPC member)', async () => {
        const subject = spcMemberToken.transferFromWithRef(ZERO_ADDRESS, alice.address, 100, 'Nine');
        await expect(subject).to.have
          .revertedWith(REQUIRES_FAST_GOVERNORSHIP);
      });

      it('requires that zero address can only be spent from as a governor (member)', async () => {
        const subject = token.connect(bob).transferFromWithRef(ZERO_ADDRESS, alice.address, 100, 'Cat');
        await expect(subject).to.have
          .revertedWith(REQUIRES_FAST_GOVERNORSHIP);
      });

      it('requires that zero address can only be spent from as a governor (anonymous)', async () => {
        const subject = token.transferFromWithRef(ZERO_ADDRESS, alice.address, 100, 'Dog');
        await expect(subject).to.have
          .revertedWith(REQUIRES_FAST_GOVERNORSHIP);
      });

      it('allows governors to transfer from the zero address', async () => {
        const subject = () => governedToken.transferFromWithRef(ZERO_ADDRESS, alice.address, 100, 'Spider');
        await expect(subject).to
          .changeTokenBalances(token, [ZERO_ACCOUNT_MOCK, alice], [-100, 100]);
      });

      it('does not require transfer credits when drawing from the zero address', async () => {
        await spcMemberToken.drainTransferCredits();
        const subject = () => governedToken.transferFromWithRef(ZERO_ADDRESS, alice.address, 100, 'Ten');
        await expect(subject).to
          .changeTokenBalances(token, [ZERO_ACCOUNT_MOCK, alice], [-100, 100]);
      });

      it('does not impact transfer credits when drawing from the zero address', async () => {
        await spcMemberToken.addTransferCredits(1000);
        const creditsBefore = await token.transferCredits();
        await governedToken.transferFromWithRef(ZERO_ADDRESS, alice.address, 100, 'Eleven');
        const subject = await token.transferCredits();
        expect(subject).to.eq(creditsBefore);
      });
    });
  });

  /// Allowance querying.

  describe('givenAllowanceCount', async () => {
    beforeEach(async () => {
      // Let alice give allowance to bob and john.
      await token.connect(alice).approve(bob.address, 5);
      await token.connect(alice).approve(john.address, 10);
    });

    it('returns the count of allowancesByOwner', async () => {
      const count = await token.givenAllowanceCount(alice.address);
      expect(count).to.eq(2);
    });
  });

  describe('paginateAllowancesByOwner', async () => {
    beforeEach(async () => {
      // Let alice give allowance to bob and john, let bob give allowance to john.
      await token.connect(alice).approve(bob.address, 5);
      await token.connect(alice).approve(john.address, 10);
      await token.connect(bob).approve(john.address, 15);
    });

    it('returns the list of addresses to which the caller gave allowances to', async () => {
      const [[a1, a2], /*cursor*/] = await token.paginateAllowancesByOwner(alice.address, 0, 5);
      expect(a1).to.eq(bob.address);
      expect(a2).to.eq(john.address);
    });

    it('does not list addresses from which the caller has received allowances', async () => {
      const [allowances, /*cursor*/] = await token.paginateAllowancesByOwner(john.address, 0, 5);
      expect(allowances).to.be.empty;
    });
  });

  describe('receivedAllowanceCount', async () => {
    beforeEach(async () => {
      // Approve a transaction for Bob.
      await token.connect(alice).approve(bob.address, 5);
    });

    it('returns the count of allowancesBySpender', async () => {
      const count = await token.receivedAllowanceCount(bob.address);
      expect(count).to.eq(1);
    });
  });

  describe('paginateAllowancesBySpender', async () => {
    beforeEach(async () => {
      // Let alice give allowance to bob and john, let bob give allowance to john.
      await token.connect(alice).approve(bob.address, 5);
      await token.connect(alice).approve(john.address, 10);
      await token.connect(bob).approve(john.address, 15);
    });

    it('returns the list of addresses to which the caller gave allowances to', async () => {
      const [[a1, a2], /*cursor*/] = await token.paginateAllowancesBySpender(john.address, 0, 5);
      expect(a1).to.eq(alice.address);
      expect(a2).to.eq(bob.address);
    });

    it('does not list addresses to which the caller has given allowances', async () => {
      const [allowances, /*cursor*/] = await token.paginateAllowancesBySpender(alice.address, 0, 5);
      expect(allowances).to.be.empty;
    });
  });

  /// ERC1404 implementation.
  describe('ERC1404', async () => {
    describe('detectTransferRestriction has codes for', async () => {
      it('the lack of transfer credits', async () => {
        const subject = await token.detectTransferRestriction(bob.address, alice.address, 1);
        expect(subject).to.eq(INSUFFICIENT_TRANSFER_CREDITS_CODE);
      });

      it('the lack of sender membership', async () => {
        await spcMemberToken.addTransferCredits(1);
        const subject = await token.detectTransferRestriction(anonymous.address, alice.address, 1);
        expect(subject).to.eq(REQUIRES_FAST_MEMBERSHIP_CODE);
      });

      it('the lack of recipient membership', async () => {
        await spcMemberToken.addTransferCredits(1);
        const subject = await token.detectTransferRestriction(bob.address, anonymous.address, 1);
        expect(subject).to.eq(REQUIRES_FAST_MEMBERSHIP_CODE);
      });

      it('sender and recipient being identical', async () => {
        await spcMemberToken.addTransferCredits(1);
        const subject = await token.detectTransferRestriction(bob.address, bob.address, 1);
        expect(subject).to.eq(REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT_CODE);
      });

      it('returns zero when the transfer is possible', async () => {
        await spcMemberToken.addTransferCredits(1);
        const subject = await token.detectTransferRestriction(bob.address, alice.address, 1);
        expect(subject).to.eq(0);
      });
    });

    describe('messageForTransferRestriction has a message for', async () => {
      it('the lack of transfer credits', async () => {
        const subject = await token.messageForTransferRestriction(INSUFFICIENT_TRANSFER_CREDITS_CODE);
        expect(subject).to.eq(INSUFFICIENT_TRANSFER_CREDITS);
      });

      it('exchange membership required', async () => {
        const subject = await token.messageForTransferRestriction(REQUIRES_EXCHANGE_MEMBERSHIP_CODE);
        expect(subject).to.eq(REQUIRES_EXCHANGE_MEMBERSHIP);
      });

      it('the lack of FAST membership', async () => {
        const subject = await token.messageForTransferRestriction(REQUIRES_FAST_MEMBERSHIP_CODE);
        expect(subject).to.eq(REQUIRES_FAST_MEMBERSHIP);
      });

      it('sender and recipient being identical', async () => {
        const subject = await token.messageForTransferRestriction(REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT_CODE);
        expect(subject).to.eq(REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT);
      });

      it('errors when the restriction code is unknown', async () => {
        const subject = token.messageForTransferRestriction(5);
        await expect(subject).to.have
          .revertedWith(UNKNOWN_RESTRICTION_CODE);
      })
    });
  });

  describe('beforeRemovingMember', async () => {
    beforeEach(async () => {
      await spcMemberToken.mint(1_000, 'Give me the money');
    });

    it('cannot be called directly', async () => {
      const subject = token.beforeRemovingMember(alice.address);
      await expect(subject).to.have
        .revertedWith(INTERNAL_METHOD);
    });

    describe('when successful', async () => {
      let tokenAsItself: FastTokenFacet;

      beforeEach(async () => {
        // Give alice some tokens.
        // await governedToken.transferFrom(ZERO_ADDRESS, alice.address, 500);
        // Add transfer credits to the token contract.
        await spcMemberToken.addTransferCredits(1_000);
        // Let alice give allowance to bob, and john give allowance to alice.
        await Promise.all([
          token.connect(alice).approve(bob.address, 500),
          token.connect(john).approve(alice.address, 500)
        ]);
        // Provision the fast with some ETH.
        await ethers.provider.send('hardhat_setBalance', [token.address, '0xde0b6b3a7640000']);
        // Allow to impersonate the FAST.
        await ethers.provider.send("hardhat_impersonateAccount", [token.address]);
        tokenAsItself = await token.connect(await ethers.getSigner(token.address));
      });

      afterEach(async () => {
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [token.address]);
      });

      it('reverts if the member to remove still has a positive balance');

      it('sets allowances to / from the removed members to zero', async () => {
        await tokenAsItself.beforeRemovingMember(alice.address);
        expect(await token.allowance(alice.address, bob.address)).to.eq(0);
        expect(await token.allowance(john.address, alice.address)).to.eq(0);
      });

      it('removes given and received allowances', async () => {
        await tokenAsItself.beforeRemovingMember(alice.address);
        // Check that allowances received by the members are gone.
        const [ra, /*cursor*/] = await token.paginateAllowancesBySpender(bob.address, 0, 5);
        expect(ra).to.be.empty
        // Check that allowances given by the member are gone.
        const [ga, /*cursor*/] = await token.paginateAllowancesByOwner(alice.address, 0, 5);
        expect(ga).to.be.empty
      });

      it('emits a Disapproval event as many times as it removed allowance', async () => {
        const subject = tokenAsItself.beforeRemovingMember(alice.address);
        // Note that we're observing the fast diamond, not just the token facet.
        // This is because the event is not emitted by the token facet itself.
        await expect(subject).to
          .emit(fast, 'Disapproval')
          .withArgs(alice.address, bob.address);
        await expect(subject).to
          .emit(fast, 'Disapproval')
          .withArgs(john.address, alice.address);
      });
    });
  })
});
