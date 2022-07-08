import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { negOne, one, oneMillion, REQUIRES_FAST_GOVERNORSHIP, REQUIRES_SPC_MEMBERSHIP } from '../utils';
import { deploymentSalt, toHexString } from '../../src/utils';
import { Spc, Exchange, FastAccessFacet } from '../../typechain';
chai.use(solidity);
chai.use(smock.matchers);

const FAST_FIXTURE_NAME = 'FastAccessFixture';
// TODO: We probably want to remove FastTopFacet, FastTokenFacet and FastFrontendFacet and replace them by fakes...
const FAST_FACETS = [
  'FastTopFacet',
  'FastAccessFacet',
  'FastTokenFacet',
  'FastFrontendFacet'
];

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

const fastDeployFixture = deployments.createFixture(async (hre, uOpts) => {
  const initOpts = uOpts as FastFixtureOpts;
  const { deployer, ...initFacetArgs } = initOpts;
  // Deploy the diamond.
  return await deployments.diamond.deploy(FAST_FIXTURE_NAME, {
    from: initOpts.deployer,
    owner: initOpts.deployer,
    facets: FAST_FACETS,
    execute: {
      contract: 'FastInitFacet',
      methodName: 'initialize',
      args: [initFacetArgs],
    },
    deterministicSalt: deploymentSalt(hre)
  });
});

describe('FastAccessFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    governor: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    rob: SignerWithAddress,
    john: SignerWithAddress;
  let spc: FakeContract<Spc>,
    exchange: FakeContract<Exchange>,
    access: FastAccessFacet,
    governedAccess: FastAccessFacet,
    spcMemberAccess: FastAccessFacet;


  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, governor, alice, bob, rob, john] = await ethers.getSigners();
    // Mock an SPC and an Exchange contract.
    spc = await smock.fake('Spc');
    exchange = await smock.fake('Exchange');
    exchange.spcAddress.returns(spc.address);
    await Promise.all(
      [alice, bob, rob, john].map(
        async ({ address }) => exchange.isMember.whenCalledWith(address).returns(true)
      )
    );

  });

  beforeEach(async () => {
    spc.isMember.whenCalledWith(spcMember.address).returns(true);
    spc.isMember.returns(false);

    const initOpts: FastFixtureOpts = {
      deployer: deployer.address,
      governor: governor.address,
      exchange: exchange.address,
      spc: spc.address,
      name: 'Better, Stronger, FASTer',
      symbol: 'BSF',
      decimals: BigNumber.from(18),
      hasFixedSupply: true,
      isSemiPublic: true
    };
    await fastDeployFixture(initOpts);
    access = await ethers.getContract<FastAccessFacet>(FAST_FIXTURE_NAME);
    governedAccess = access.connect(governor);
    spcMemberAccess = access.connect(spcMember);
  });

  /// Governorship related stuff.

  describe('IHasGovernors implementation', async () => {
    describe('addGovernor', async () => {
      it('requires SPC membership (anonymous)', async () => {
        const subject = access.addGovernor(alice.address);
        // Check that the registry
        await expect(subject).to.be
          .revertedWith(REQUIRES_SPC_MEMBERSHIP);
      });

      it('requires SPC membership (governor)', async () => {
        const subject = access.addGovernor(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_SPC_MEMBERSHIP);
      });

      it('requires that the address is not a governor yet', async () => {
        await spcMemberAccess.addGovernor(alice.address)
        const subject = spcMemberAccess.addGovernor(alice.address);
        await expect(subject).to.be
          .revertedWith('Address already in set');
      });

      it('adds the given address as a governor', async () => {
        await spcMemberAccess.addGovernor(alice.address);
        const subject = await access.isGovernor(alice.address);
        expect(subject).to.eq(true);
      });

      it('delegates provisioning Eth to the governor using the registry', async () => {
        await spcMemberAccess.addGovernor(alice.address);
        // TODO: Will only work once `smock` fixes their injection thingy.
        // expect(fastTopFacetMock.provisionWithEth).to.be
        //   .calledOnceWith(alice.address);
      });

      it('emits a GovernorAdded event', async () => {
        const subject = spcMemberAccess.addGovernor(alice.address);
        await expect(subject).to
          .emit(access, 'GovernorAdded')
          .withArgs(alice.address);
      });
    });

    describe('removeGovernor', async () => {
      beforeEach(async () => {
        // We want alice to be a governor for these tests.
        await spcMemberAccess.addGovernor(alice.address);
      });

      it('requires SPC membership (anonymous)', async () => {
        const subject = access.removeGovernor(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_SPC_MEMBERSHIP);
      });

      it('requires SPC membership (governor)', async () => {
        const subject = governedAccess.removeGovernor(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_SPC_MEMBERSHIP);
      });

      it('requires that the address is an existing governor', async () => {
        const subject = spcMemberAccess.removeGovernor(bob.address);
        await expect(subject).to.be
          .revertedWith('Address does not exist in set');
      });

      it('removes the given address as a governor', async () => {
        await spcMemberAccess.removeGovernor(alice.address);
        const subject = await access.isGovernor(alice.address);
        expect(subject).to.eq(false);
      });

      it('emits a GovernorRemoved event', async () => {
        const subject = spcMemberAccess.removeGovernor(alice.address);
        await expect(subject).to
          .emit(access, 'GovernorRemoved')
          .withArgs(alice.address);
      });
    });

    describe('isGovernor', async () => {
      beforeEach(async () => {
        await spcMemberAccess.addGovernor(alice.address);
      });

      it('returns true when the address is a governor', async () => {
        const subject = await access.isGovernor(alice.address);
        expect(subject).to.eq(true);
      });

      it('returns false when the address is not a governor', async () => {
        const subject = await access.isGovernor(bob.address);
        expect(subject).to.eq(false);
      });
    });

    describe('governorCount', async () => {
      beforeEach(async () => {
        await spcMemberAccess.addGovernor(alice.address);
      });

      it('returns the current count of governors', async () => {
        const subject = await access.governorCount();
        expect(subject).to.eq(2);
      });
    });

    describe('paginateGovernors', async () => {
      beforeEach(async () => {
        // Add 4 governors - so there is a total of 5.
        await Promise.all([alice, bob, rob, john].map(
          async ({ address }) => spcMemberAccess.addGovernor(address)
        ));
      });

      it('returns the cursor to the next page', async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [, cursor] = await access.paginateGovernors(0, 3);
        expect(cursor).to.eq(3);
      });

      it('does not crash when overflowing and returns the correct cursor', async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [, cursor] = await access.paginateGovernors(1, 10);
        expect(cursor).to.eq(5);
      });

      it('returns the governors in the order they were added', async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [values,] = await access.paginateGovernors(0, 5);
        expect(values).to.be
          .ordered.members([
            governor.address,
            alice.address,
            bob.address,
            rob.address,
            john.address,
          ]);
      });
    });
  });

  /// Membership related stuff.

  describe('IHasMembers', async () => {
    describe('addMember', async () => {
      it('requires governance (anonymous)', async () => {
        const subject = access.addMember(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_FAST_GOVERNORSHIP);
      });

      it('requires governance (SPC governor)', async () => {
        const subject = spcMemberAccess.addMember(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_FAST_GOVERNORSHIP);
      });

      it('requires that the address is already a member of the Exchange');

      it('requires that the address is not a member yet', async () => {
        await governedAccess.addMember(alice.address)
        const subject = governedAccess.addMember(alice.address);
        await expect(subject).to.be
          .revertedWith('Address already in set');
      });

      it('adds the given address as a member', async () => {
        await governedAccess.addMember(alice.address);
        const subject = await access.isMember(alice.address);
        expect(subject).to.eq(true);
      });

      it('delegates to the Exchange contract to signal the membership addition');

      it('provisions the member with Eth', async () => {
        // Add eth to the FAST contract.
        await ethers.provider.send("hardhat_setBalance", [access.address, toHexString(oneMillion)]);
        // Make sure alice doesn't have eth.
        await ethers.provider.send("hardhat_setBalance", [alice.address, '0x0']);
        const subject = async () => await governedAccess.addMember(alice.address);
        // Since we use the diamond pattern, we can't mock anymore :(
        // So... We test cross-facet functionality.
        await expect(subject).to.changeEtherBalances([access, alice], [negOne, one]);
      });

      it('emits a MemberAdded event', async () => {
        const subject = governedAccess.addMember(alice.address);
        await expect(subject).to
          .emit(access, 'MemberAdded')
          .withArgs(alice.address);
      });
    });

    describe('removeMember', async () => {
      beforeEach(async () => {
        // We want alice to be a member for these tests.
        await governedAccess.addMember(alice.address);
      });

      it('requires governance (anonymous)', async () => {
        const subject = access.removeMember(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_FAST_GOVERNORSHIP);
      });

      it('requires governance (SPC governor)', async () => {
        const subject = spcMemberAccess.removeMember(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_FAST_GOVERNORSHIP);
      });

      it('requires that the address is an existing member', async () => {
        const subject = governedAccess.removeMember(bob.address);
        await expect(subject).to.be
          .revertedWith('Address does not exist in set');
      });

      it('removes the given address as a member', async () => {
        await governedAccess.removeMember(alice.address);
        const subject = await access.isMember(alice.address);
        expect(subject).to.eq(false);
      });

      it('delegates to the token contract', async () => {
        await governedAccess.removeMember(alice.address);
        // TODO: Will only work once `smock` fixes their injection thingy.
        // expect(fastTokenFacetMock.beforeRemovingMember).to.be
        //   .calledOnceWith(alice.address);
      });

      it('delegates to the Exchange contract to signal the membership addition');

      it('emits a MemberRemoved event', async () => {
        const subject = governedAccess.removeMember(alice.address);
        await expect(subject).to
          .emit(access, 'MemberRemoved')
          .withArgs(alice.address);
      });
    });

    describe('isMember', async () => {
      beforeEach(async () => {
        await governedAccess.addMember(alice.address);
      });

      it('returns true when the address is a member', async () => {
        const subject = await access.isMember(alice.address);
        expect(subject).to.eq(true);
      });

      it('returns false when the address is not a member', async () => {
        const subject = await access.isMember(bob.address);
        expect(subject).to.eq(false);
      });
    });

    describe('memberCount', async () => {
      beforeEach(async () => {
        await governedAccess.addMember(alice.address);
      });

      it('returns the current count of members', async () => {
        const subject = await access.memberCount();
        expect(subject).to.eq(1);
      });
    });

    describe('paginateMembers', async () => {
      beforeEach(async () => {
        await Promise.all(
          [alice, bob, rob, john].map(
            async ({ address }) => governedAccess.addMember(address)
          )
        );
      });

      it('returns the cursor to the next page', async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [, cursor] = await access.paginateMembers(0, 3);
        expect(cursor).to.eq(3);
      });

      it('does not crash when overflowing and returns the correct cursor', async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [, cursor] = await access.paginateMembers(1, 10);
        expect(cursor).to.eq(4);
      });

      it('returns the members in the order they were added', async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [values,] = await access.paginateMembers(0, 5);
        expect(values).to.be
          .ordered.members([
            alice.address,
            bob.address,
            rob.address,
            john.address
          ]);
      });
    });
  });

  /// Flags.

  describe('flags', async () => {
    it('is accurate when all flags set', async () => {
      await spcMemberAccess.addGovernor(alice.address);
      await governedAccess.addMember(alice.address);
      const { isGovernor, isMember } = await access.flags(alice.address);
      expect(isGovernor).to.eq(true);
      expect(isMember).to.eq(true);
    });

    it('is accurate when only isGovernor is set', async () => {
      await spcMemberAccess.addGovernor(alice.address);
      const { isGovernor, isMember } = await access.flags(alice.address);
      expect(isGovernor).to.eq(true);
      expect(isMember).to.eq(false);
    });

    it('is accurate when only isMember is set', async () => {
      await governedAccess.addMember(alice.address);
      const { isGovernor, isMember } = await access.flags(alice.address);
      expect(isGovernor).to.eq(false);
      expect(isMember).to.eq(true);
    });

    it('is accurate when no flags are set', async () => {
      const { isGovernor, isMember } = await access.flags(alice.address);
      expect(isGovernor).to.eq(false);
      expect(isMember).to.eq(false);
    });
  });
});
