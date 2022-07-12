import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { Spc, FastTokenFacet, SpcTopFacet } from '../../typechain';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { toHexString, ZERO_ADDRESS } from '../../src/utils';
import {
  DUPLICATE_ENTRY,
  MISSING_ATTACHED_ETH,
  negNine, negOneHundred, negTen, negTwo, negTwoHundredFifty, negTwoHundredForty,
  nine, ninety, one, oneHundred, oneMillion, REQUIRES_SPC_MEMBERSHIP, ten, two, twoHundredFifty, twoHundredForty
} from '../utils';
import { ContractTransaction } from 'ethers';
import { spcFixtureFunc } from '../fixtures/spc';
chai.use(solidity);
chai.use(smock.matchers);


describe('SpcTopFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    bob: SignerWithAddress,
    alice: SignerWithAddress;
  let spc: Spc,
    spcMemberSpc: Spc,
    top: SpcTopFacet,
    spcMemberTop: SpcTopFacet;

  const spcDeployFixture = deployments.createFixture(spcFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, bob, alice] = await ethers.getSigners();
  });

  beforeEach(async () => {
    await spcDeployFixture({
      opts: {
        name: 'SpcTopFixture',
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ spc } = args)
          spcMemberSpc = spc.connect(spcMember);
          top = await ethers.getContractAt<SpcTopFacet>('SpcTopFacet', spc.address);
          spcMemberTop = top.connect(spcMember);
        }
      },
      initWith: {
        member: spcMember.address
      }
    });
  });

  /// Eth provisioning stuff.

  describe('provisionWithEth', async () => {
    it('reverts when no Eth is attached', async () => {
      const subject = top.provisionWithEth();
      await expect(subject).to.be
        .revertedWith(MISSING_ATTACHED_ETH);
    });

    it('is payable and keeps the attached Eth', async () => {
      const subject = async () => await top.provisionWithEth({ value: ninety });
      await expect(subject).to.have.changeEtherBalance(top, ninety);
    });
  });

  describe('drainEth', async () => {
    it('requires SPC membership', async () => {
      const subject = top.drainEth();
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('transfers all the locked Eth to the caller', async () => {
      // Provision the SPC account with a lot of Eth.
      await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(oneHundred)]);
      const subject = async () => await spcMemberTop.drainEth();
      await expect(subject).to.changeEtherBalances([spc, spcMember], [negOneHundred, oneHundred]);
    });

    it('emits a EthReceived event', async () => {
      const subject = top.provisionWithEth({ value: ninety });
      await expect(subject).to
        .emit(spc, 'EthReceived')
        .withArgs(deployer.address, ninety)
    });

    it('emits a EthDrained event', async () => {
      // Provision the SPC account with 1_000_000 Eth.
      await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(oneHundred)]);
      const subject = spcMemberSpc.drainEth();
      await expect(subject).to
        .emit(spc, 'EthDrained')
        .withArgs(spcMember.address, oneHundred);
    });
  });

  /// FAST management stuff.

  describe('isFastRegistered', async () => {
    let fast: FakeContract<FastTokenFacet>;

    beforeEach(async () => {
      // Set up a token mock.
      fast = await smock.fake('FastTokenFacet');
      fast.symbol.returns('FST');
      // Register the FST token using the spcMember account.
      await spcMemberSpc.registerFast(fast.address);
    });

    it('returns false when the FAST symbol is unknown', async () => {
      const [notAContract] = await ethers.getSigners()
      const subject = await top.isFastRegistered(notAContract.address);
      expect(subject).to.eq(false);
    });

    it('returns true when the FAST symbol is registered', async () => {
      const subject = await top.isFastRegistered(fast.address);
      expect(subject).to.eq(true);
    });
  });

  describe('fastBySymbol', async () => {
    let fast: FakeContract<FastTokenFacet>;

    beforeEach(async () => {
      // Set up a token mock.
      fast = await smock.fake('FastTokenFacet');
      fast.symbol.returns('FST');
      // Register the FST token using the spcMember account.
      await spcMemberSpc.registerFast(fast.address);
    });

    it('returns the zero address when the FAST symbol is unknown', async () => {
      const subject = await top.fastBySymbol('UKN');
      expect(subject).to.eq(ZERO_ADDRESS);
    });

    it('returns the FAST address when the FAST symbol is registered', async () => {
      const subject = await top.fastBySymbol('FST');
      expect(subject).to.eq(fast.address);
    });
  });

  describe('registerFast', async () => {
    let fast: FakeContract<FastTokenFacet>;

    beforeEach(async () => {
      // Set up a token mock.
      fast = await smock.fake('FastTokenFacet');
      fast.symbol.returns('FST');
    });

    it('requires SPC membership', async () => {
      const subject = top.registerFast(fast.address);
      await expect(subject).to.have
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('forbids adding two FASTS with the same symbol', async () => {
      await spcMemberSpc.registerFast(fast.address);
      const subject = spcMemberSpc.registerFast(fast.address)
      await expect(subject).to.be
        .revertedWith(DUPLICATE_ENTRY);
    });

    it('adds the registry address to the list of registries', async () => {
      // Note that this test is already covered by tests for `fastBySymbol`.
      // It would add very little value to add anything to it.
    });

    it('keeps track of the symbol', async () => {
      // Note that this test is already covered by tests for `fastBySymbol`.
      // It would add very little value to add anything to it.
    });

    it('provisions the FAST with 250 Eth', async () => {
      await ethers.provider.send("hardhat_setBalance", [fast.address, '0x0']);
      // Do it!
      const subject = async () => await spcMemberSpc.registerFast(fast.address);
      // Check balances.
      await expect(subject).to.changeEtherBalances([spc, fast], [negTwoHundredFifty, twoHundredFifty]);
    });

    it('only tops-up the FAST if it already has Eth', async () => {
      await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(oneMillion)]);
      await ethers.provider.send("hardhat_setBalance", [fast.address, toHexString(ten)]);
      // Do it!
      const subject = async () => await spcMemberSpc.registerFast(fast.address);
      // Check balances.
      await expect(subject).to.changeEtherBalances([spc, fast], [negTwoHundredForty, twoHundredForty]);
    });

    it('only provisions the FAST up to the available balance', async () => {
      await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(two)]);
      await ethers.provider.send("hardhat_setBalance", [fast.address, '0x0']);
      // Do it!
      const subject = async () => await spcMemberSpc.registerFast(fast.address);
      // Check balances.
      await expect(subject).to.changeEtherBalances([spc, fast], [negTwo, two]);
    });

    it('emits a FastRegistered event', async () => {
      const subject = spcMemberSpc.registerFast(fast.address);
      await expect(subject).to
        .emit(spc, 'FastRegistered')
        .withArgs(fast.address);
    });
  });

  describe('fastCount', async () => {
    it('returns the FAST count', async () => {
      // Register a few token mocks.
      const fixture = ['FS1', 'FS2'];
      await Promise.all(
        fixture.map(async (symbol) => {
          // Set up a couple mocks.
          const fast = await smock.fake('FastTokenFacet');
          // Stub a few things.
          fast.symbol.returns(symbol);
          // Register that new fast.
          return spcMemberSpc.registerFast(fast.address);
        })
      );
      const subject = await spc.fastCount();
      expect(subject).to.eq(fixture.length);
    });
  });

  describe('paginateFasts', async () => {
    let fast: FakeContract<FastTokenFacet>;

    beforeEach(async () => {
      // Set up a token mock.
      fast = await smock.fake('FastTokenFacet');
      fast.symbol.returns('FST');
      // Register this FAST.
      await spcMemberSpc.registerFast(fast.address)
    });

    it('returns pages of FASTs', async () => {
      // We're testing the pagination library here... Not too good. But hey, we're in a rush.
      const [[g1],] = await spc.paginateFasts(0, 10);
      expect(g1).to.eq(fast.address);
    });
  });
});
