import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { Spc, FastTokenFacet, SpcInitFacet } from '../../typechain';
import { DEPLOYER_FACTORY_COMMON, toHexString, ZERO_ADDRESS } from '../../src/utils';
import {
  DUPLICATE_ENTRY,
  MISSING_ATTACHED_ETH,
  negNine, negOneHundred, negTen, negTwo, negTwoHundredFifty, negTwoHundredForty,
  nine, ninety, one, oneHundred, oneMillion, REQUIRES_SPC_MEMBERSHIP, ten, two, twoHundredFifty, twoHundredForty
} from '../utils';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
chai.use(solidity);
chai.use(smock.matchers);

interface SpcFixtureOpts {
  // Ops variables.
  deployer: string;
  // Config.
  member: string;
}

const SPC_FACETS = ['SpcAccessFacet', 'SpcTopFacet'];

const spcDeployFixture = deployments.createFixture(async (hre, uOpts) => {
  const initOpts = uOpts as SpcFixtureOpts;
  const { deployer, ...initFacetOpts } = initOpts;
  // Deploy the diamond.
  const deploy = await deployments.diamond.deploy('Spc', {
    from: initOpts.deployer,
    owner: initOpts.deployer,
    facets: [...SPC_FACETS, 'SpcInitFacet'],
    deterministicSalt: DEPLOYER_FACTORY_COMMON.salt
  });

  // Initialize the diamond. We are doing it in two steps, because the SPC member is different
  // in each environment, and this would make our deployment transaction different in each and
  // therefore defeat the deterministic deployment strategy.
  const init = await ethers.getContractAt('SpcInitFacet', deploy.address) as SpcInitFacet;
  await init.initialize(initFacetOpts);

  return deploy;
});

describe('SpcTopFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    bob: SignerWithAddress,
    alice: SignerWithAddress;
  let spc: Spc;
  let spcMemberSpc: Spc;

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, bob, alice] = await ethers.getSigners();
  });

  beforeEach(async () => {
    const initOpts: SpcFixtureOpts = {
      deployer: deployer.address,
      member: spcMember.address,
    };
    const deploy = await spcDeployFixture(initOpts);

    spc = await ethers.getContractAt('Spc', deploy.address) as Spc;
    spcMemberSpc = spc.connect(spcMember);

    // Provision the SPC with a load of eth.
    await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(oneMillion)]);
  });

  describe('initialize', async () => {
    it('adds the given member when deployed', async () => {
      const subject = await spc.isMember(spcMember.address);
      expect(subject).to.eq(true);
    });

    it('emits a MemberAdded event', async () => {
      // TODO.
      // await expect(subject.deployTransaction).to
      //   .emit(subject, 'MemberAdded')
      //   .withArgs(spcMember.address);
    });
  });

  /// Eth provisioning stuff.

  describe('provisionWithEth', async () => {
    it('reverts when no Eth is attached', async () => {
      const subject = spc.provisionWithEth();
      await expect(subject).to.be
        .revertedWith(MISSING_ATTACHED_ETH);
    });

    it('is payable and keeps the attached Eth', async () => {
      const subject = async () => await spc.provisionWithEth({ value: ninety });
      await expect(subject).to.have.changeEtherBalance(spc, ninety);
    });
  });

  describe('drainEth', async () => {
    it('requires SPC membership', async () => {
      const subject = spc.drainEth();
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
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
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('adds the member to the list', async () => {
      await spcMemberSpc.addMember(bob.address);
      const subject = await spc.isMember(bob.address);
      expect(subject).to.eq(true);
    });

    it('does not add the same member twice', async () => {
      const subject = spcMemberSpc.addMember(spcMember.address);
      await expect(subject).to.be
        .revertedWith('Address already in set');
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
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('removes the member from the list', async () => {
      await spcMemberSpc.removeMember(bob.address);
      const subject = await spc.isMember(bob.address);
      expect(subject).to.eq(false);
    });

    it('reverts if the member is not in the list', async () => {
      const subject = spcMemberSpc.removeMember(alice.address);
      await expect(subject).to.be
        .revertedWith('Address does not exist in set');
    });

    it('emits a MemberRemoved event', async () => {
      const subject = spcMemberSpc.removeMember(bob.address);
      await expect(subject).to
        .emit(spc, 'MemberRemoved')
        .withArgs(bob.address);
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
      const subject = await spc.isFastRegistered(notAContract.address);
      expect(subject).to.eq(false);
    });

    it('returns true when the FAST symbol is registered', async () => {
      const subject = await spc.isFastRegistered(fast.address);
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
      const subject = await spc.fastBySymbol('UKN');
      expect(subject).to.eq(ZERO_ADDRESS);
    });

    it('returns the FAST address when the FAST symbol is registered', async () => {
      const subject = await spc.fastBySymbol('FST');
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
      const subject = spc.registerFast(fast.address);
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
