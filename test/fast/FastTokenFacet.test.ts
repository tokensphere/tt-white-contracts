import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { FakeContract, MockContract, smock } from '@defi-wonderland/smock';
import { Spc, Exchange, Fast, FastTopFacet, FastAccessFacet, FastTokenFacet, FastHistoryFacet } from '../../typechain';
import { ZERO_ADDRESS, ZERO_ACCOUNT_MOCK } from '../../src/utils';
import {
  BALANCE_IS_POSITIVE,
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
  DEFAULT_TRANSFER_REFERENCE,
  impersonateDiamond
} from '../utils';
import { fastFixtureFunc, FAST_INIT_DEFAULTS } from './utils';
chai.use(solidity);
chai.use(smock.matchers);


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
    tokenMock: MockContract<FastTokenFacet>,
    topMock: MockContract<FastTopFacet>,
    accessMock: MockContract<FastAccessFacet>,
    historyMock: MockContract<FastHistoryFacet>,
    governedToken: FastTokenFacet,
    spcMemberToken: FastTokenFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, governor, exchangeMember, alice, bob, john, anonymous] = await ethers.getSigners();
    // Mock an SPC and an Exchange contract.
    spc = await smock.fake('Spc');
    exchange = await smock.fake('Exchange');
    exchange.spcAddress.returns(spc.address);
  });

  beforeEach(async () => {
    await fastDeployFixture({
      opts: {
        name: 'FastTokenFixture',
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ fast, accessMock, topMock, tokenMock, historyMock } = args);
          token = await ethers.getContractAt<FastTokenFacet>('FastTokenFacet', fast.address);
          governedToken = token.connect(governor);
          spcMemberToken = token.connect(spcMember);
        }
      },
      initWith: {
        spc: spc.address,
        exchange: exchange.address,
        governor: governor.address
      }
    });

    // Reset expected returns.
    spc.isMember.reset();
    exchange.isMember.reset();
    accessMock.isMember.reset();

    // Add an extra member to the exchange.
    exchange.isMember.whenCalledWith(exchangeMember.address).returns(true);
    // Add a few Exchange and FAST members.
    for (const { address } of [alice, bob, john]) {
      exchange.isMember.whenCalledWith(address).returns(true);
      accessMock.isMember.whenCalledWith(address).returns(true);
    }
    // Set the SPC member.
    spc.isMember.whenCalledWith(spcMember.address).returns(true);
    // Set the defaults when querying the SPC or Exchange fakes.
    spc.isMember.returns(false);
    exchange.isMember.returns(false);

    topMock.hasFixedSupply.reset();
    topMock.hasFixedSupply.returns(true);
    topMock.isSemiPublic.reset();
    topMock.isSemiPublic.returns(false);
  });

  /// Public stuff.

  describe('initialize', async () => {
    it('keeps track of the ERC20 parameters and extra ones', async () => {
      const name = await token.name();
      expect(name).to.eq(FAST_INIT_DEFAULTS.name);

      const symbol = await token.symbol();
      expect(symbol).to.eq(FAST_INIT_DEFAULTS.symbol);

      const decimals = await token.decimals();
      expect(decimals).to.eq(FAST_INIT_DEFAULTS.decimals);

      const transferCredits = await token.transferCredits();
      expect(transferCredits).to.eq(0);
    });
  });

  /// Public member getters.

  describe('name', async () => {
    it('returns the name', async () => {
      const subject = await token.name();
      expect(subject).to.eq(FAST_INIT_DEFAULTS.name);
    });
  });

  describe('symbol', async () => {
    it('returns the symbol', async () => {
      const subject = await token.symbol();
      expect(subject).to.eq(FAST_INIT_DEFAULTS.symbol);
    });
  });

  describe('decimals', async () => {
    it('returns the decimals', async () => {
      const subject = await token.decimals();
      expect(subject).to.eq(FAST_INIT_DEFAULTS.decimals);
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
        topMock.hasFixedSupply.returns(false);
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
      historyMock.minted.reset();
      await spcMemberToken.mint(5_000, 'Attempt 1');
      expect(historyMock.minted).to.have.been
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
      topMock.hasFixedSupply.returns(false);
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
      topMock.hasFixedSupply.returns(true);
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
      historyMock.burnt.reset();
      await spcMemberToken.burn(50, 'It is hot');
      expect(historyMock.burnt).to.have.been
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
      it('delegates to the internal performTransfer method', async () => {
        tokenMock.performTransfer.reset();

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
        expect(tokenMock.performTransfer).to.have.been
          .calledOnceWith(args)
          .delegatedFrom(token.address);
      });
    });

    describe('transferWithRef', async () => {
      it('delegates to the internal performTransfer method', async () => {
        tokenMock.performTransfer.reset();

        const args = {
          spender: alice.address,
          from: alice.address,
          to: bob.address,
          amount: BigNumber.from(1),
          ref: 'Some ref message'
        };
        await token.connect(alice).transferWithRef(args.to, args.amount, args.ref);
        // Expect performTransfer to be called correctly.
        expect(tokenMock.performTransfer).to.have.been
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
        topMock.hasFixedSupply.returns(false);
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
      it('delegates to the internal performApproval method', async () => {
        tokenMock.performApproval.reset()

        const args = {
          spender: alice.address,
          from: john.address,
          amount: BigNumber.from(1),
        };

        // Let alice give allowance to john.
        await token.connect(alice).approve(args.from, args.amount);

        // Expect performApproval to be called correctly.
        expect(tokenMock.performApproval).to.have.been
          .calledOnceWith(args.spender, args.from, args.amount)
          .delegatedFrom(token.address);
      });

      it('requires FAST membership', async () => {
        // Remove alice as a member.
        accessMock.isMember.reset();
        accessMock.isMember.whenCalledWith(alice.address).returns(false);

        // Let alice give allowance to john.
        const subject = token.connect(alice).approve(john.address, 1);

        await expect(subject).to.have.been
          .revertedWith(REQUIRES_FAST_MEMBERSHIP);
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
          .emit(token, 'Approval')
          .withArgs(alice.address, bob.address, 60)
      });
    });

    describe('disapprove', async () => {
      beforeEach(async () => {
        // Let bob give john an allowance.
        await token.connect(bob).approve(john.address, 15);
      });

      it('delegates to the internal Disapproval method', async () => {
        tokenMock.performDisapproval.reset();

        const args = {
          spender: bob.address,
          from: john.address,
        };

        // Remove Johns approval.
        await token.connect(bob).disapprove(args.from);

        // Expect performDisapproval to be called correctly.
        expect(tokenMock.performDisapproval).to.have.been
          .calledOnceWith(args.spender, args.from)
          .delegatedFrom(token.address);
      });

      it('sets the allowance to zero', async () => {
        await token.connect(bob).disapprove(john.address);
        const subject = await token.allowance(bob.address, john.address);
        expect(subject).to.eq(0);
      });

      it('removes the spender received allowance', async () => {
        await token.connect(bob).disapprove(john.address);
        const [allowances, /*cursor*/] = await token.paginateAllowancesBySpender(john.address, 0, 5);
        expect(allowances).to.be.empty;
      });

      it('removes the original given allowance', async () => {
        await token.connect(bob).disapprove(john.address);
        const [allowances, /*cursor*/] = await token.paginateAllowancesByOwner(bob.address, 0, 5);
        expect(allowances).to.be.empty;
      });

      it('emits a Disapproval event', async () => {
        const subject = token.connect(bob).disapprove(john.address);
        // Note that we're observing the fast diamond, not just the token facet.
        // This is because the event is not emitted by the token facet itself.
        await expect(subject).to
          .emit(token, 'Disapproval')
          .withArgs(bob.address, john.address);
      });
    });

    describe('transferFrom', async () => {
      it('delegates to the internal performTransfer method', async () => {
        tokenMock.performTransfer.reset();

        const args = {
          spender: alice.address,
          from: alice.address,
          to: bob.address,
          amount: BigNumber.from(1),
          ref: DEFAULT_TRANSFER_REFERENCE
        };
        await token.connect(alice).transferFrom(args.from, args.to, args.amount);
        // Expect performTransfer to be called correctly.
        expect(tokenMock.performTransfer).to.have.been
          .calledOnceWith(args)
          .delegatedFrom(token.address);
      });
    });

    describe('transferFromWithRef', async () => {
      beforeEach(async () => {
        // Let bob give allowance to john.
        await token.connect(bob).approve(john.address, 100);
      });

      it('delegates to the internal performTransfer method', async () => {
        tokenMock.performTransfer.reset();

        const args = {
          spender: alice.address,
          from: alice.address,
          to: bob.address,
          amount: BigNumber.from(1),
          ref: 'Some useful ref'
        };
        await token.connect(alice).transferFromWithRef(args.from, args.to, args.amount, args.ref);
        // Expect performTransfer to be called correctly.
        expect(tokenMock.performTransfer).to.have.been
          .calledOnceWith(args)
          .delegatedFrom(token.address);
      });

      describe('when semi-public', async () => {
        beforeEach(async () => {
          topMock.isSemiPublic.returns(true);
        });

        it('requires sender membership (Exchange membership)', async () => {
          exchange.isMember.reset();
          // Only Bob will be an exchange member.
          exchange.isMember.whenCalledWith(bob.address).returns(true);
          exchange.isMember.returns(false);

          const subject = token.connect(alice).transferFromWithRef(john.address, bob.address, 100, 'One');
          await expect(subject).to.have
            .revertedWith(REQUIRES_EXCHANGE_MEMBERSHIP);
        });

        it('requires recipient membership (Exchange membership)', async () => {
          exchange.isMember.reset();
          // Only Bob will be an exchange member.
          exchange.isMember.whenCalledWith(bob.address).returns(true);
          exchange.isMember.returns(false);

          const subject = token.connect(alice).transferFromWithRef(bob.address, john.address, 100, 'One');
          await expect(subject).to.have
            .revertedWith(REQUIRES_EXCHANGE_MEMBERSHIP);
        });

        it('allows exchange members to transact', async () => {
          exchange.isMember.reset();
          // Bob and John will be exchange members.
          exchange.isMember.whenCalledWith(bob.address).returns(true);
          exchange.isMember.whenCalledWith(john.address).returns(true);
          exchange.isMember.returns(false);

          // Let bob give allowance to alice.
          await token.connect(bob).approve(alice.address, 100);

          const subject = () => token.connect(alice).transferFromWithRef(bob.address, john.address, 100, 'One');
          await expect(subject).to
            .changeTokenBalances(token, [bob, john], [-100, 100]);
        });
      });

      describe('when private', async () => {
        beforeEach(async () => {
          // Explicitly set the token as private.
          topMock.isSemiPublic.reset();
          topMock.isSemiPublic.returns(false);
        });

        it('requires sender membership (FAST member)', async () => {
          const subject = token.connect(john).transferFromWithRef(anonymous.address, bob.address, 100, 'One');
          await expect(subject).to.have
            .revertedWith(REQUIRES_FAST_MEMBERSHIP);
        });

        it('requires recipient membership (FAST member)', async () => {
          const subject = token.connect(john).transferFromWithRef(bob.address, anonymous.address, 100, 'One');
          await expect(subject).to.have
            .revertedWith(REQUIRES_FAST_MEMBERSHIP);
        });
      });

      it('decreases the transfer credits when not transacting from the zero address', async () => {
        // The token transfer amount.
        const transferAmount = 100;

        // Snapshot the transfer tokens before, transfer then check balance after.
        const creditsBefore = await spcMemberToken.transferCredits();
        await token.connect(john).transferFromWithRef(bob.address, alice.address, transferAmount, 'No!');
        const creditsAfter = await spcMemberToken.transferCredits();

        expect(creditsAfter).to.be.eql(creditsBefore.sub(transferAmount));
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
        historyMock.transfered.reset();
        await token.connect(john).transferFromWithRef(bob.address, alice.address, 12, 'Five')
        expect(historyMock.transfered).to.have.been
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
          .emit(token, 'Transfer')
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
        // Add transfer credits to the token contract.
        await spcMemberToken.addTransferCredits(1_000);
        // Let alice give allowance to bob, and john give allowance to alice.
        await Promise.all([
          token.connect(alice).approve(bob.address, 500),
          token.connect(john).approve(alice.address, 500)
        ]);

        // Impersonate the diamond.
        tokenAsItself = await impersonateDiamond(token);
      });

      afterEach(async () => {
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [token.address]);
      });

      it('reverts if the member to remove still has a positive balance', async () => {
        // Give alice some tokens.
        await governedToken.transferFrom(ZERO_ADDRESS, alice.address, 100);
        // Attempt to run the callback, removing alice.
        const subject = tokenAsItself.beforeRemovingMember(alice.address);
        await expect(subject).to.be
          .revertedWith(BALANCE_IS_POSITIVE);
      });

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
          .emit(token, 'Disapproval')
          .withArgs(alice.address, bob.address);
        await expect(subject).to
          .emit(token, 'Disapproval')
          .withArgs(john.address, alice.address);
      });
    });
  })
});
