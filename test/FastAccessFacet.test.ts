import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { negOne, one, oneMilion, REQUIRES_FAST_GOVERNORSHIP, REQUIRES_SPC_MEMBERSHIP } from './utils';
import { DEPLOYMENT_SALT, toHexString } from '../src/utils';
import { Spc, Exchange, Fast, FastFacet, FastInitFacet, FastTokenFacet, FastAccessFacet } from '../typechain';
chai.use(solidity);
chai.use(smock.matchers);

const FAST_FIXTURE_NAME = 'FastFixture';

interface FastFixtureOpts {
  // Ops variables.
  deployer: string;
  governor: string;
  exchange: string;
  // Config.
  name: string;
  symbol: string;
  decimals: BigNumber;
  hasFixedSupply: boolean;
  isSemiPublic: boolean;
}

const FAST_FACETS = ['FastFacet', 'FastAccessFacet', 'FastTokenFacet'];

const fastDeployFixture = deployments.createFixture(async (hre, uOpts) => {
  const initOpts = uOpts as FastFixtureOpts;
  // Deploy the fast.
  const fastDeploy = await deployments.diamond.deploy(FAST_FIXTURE_NAME, {
    from: initOpts.deployer,
    owner: initOpts.deployer,
    facets: [...FAST_FACETS, 'FastInitFacet'],
    deterministicSalt: DEPLOYMENT_SALT
  });

  // Call the initialization facet.
  const init = await ethers.getContractAt('FastInitFacet', fastDeploy.address) as FastInitFacet;
  await init.initialize(initOpts);

  // Remove the initialization facet.
  await deployments.diamond.deploy(FAST_FIXTURE_NAME, {
    from: initOpts.deployer,
    owner: initOpts.deployer,
    facets: FAST_FACETS,
    deterministicSalt: DEPLOYMENT_SALT
  });

  return fastDeploy;
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
    fastFacetMock: FakeContract<FastFacet>,
    fastTokenFacetMock: FakeContract<FastTokenFacet>,
    access: FastAccessFacet,
    governedAccess: FastAccessFacet,
    spcMemberAccess: FastAccessFacet;


  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, governor, alice, bob, rob, john] = await ethers.getSigners();
    // Mock an SPC and a FAST.
    spc = await smock.fake('Spc');
    exchange = await smock.fake('Exchange');
    exchange.spc.returns(spc.address);
  });

  beforeEach(async () => {
    spc.isMember.returns(false);
    spc.isMember.whenCalledWith(spcMember.address).returns(true);

    const initOpts: FastFixtureOpts = {
      deployer: deployer.address,
      governor: governor.address,
      exchange: exchange.address,
      name: 'Better, Stronger, FASTer',
      symbol: 'BSF',
      decimals: BigNumber.from(18),
      hasFixedSupply: true,
      isSemiPublic: true
    };
    const { address: fastAddr } = await fastDeployFixture(initOpts);
    const fast = await ethers.getContractAt('Fast', fastAddr) as Fast;

    // TODO: Once smock fixes their stuff. replace facets by fakes.
    // Get our facet addresses.
    const facetAddrs = await fast.facetAddresses();
    // Replace the fast facet by a fake.
    const fastFacetAddr = facetAddrs[facetAddrs.length - 1];
    fastFacetMock = await smock.fake('FastFacet', { address: fastFacetAddr });
    // Replace the token facet by a fake.
    const tokenFacetAddr = facetAddrs[facetAddrs.length - 3];
    fastTokenFacetMock = await smock.fake('FastTokenFacet', { address: tokenFacetAddr });

    access = fast as FastAccessFacet;
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
        // expect(fastFacetMock.provisionWithEth).to.be
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
        await spcMemberAccess.addGovernor(alice.address);
        await spcMemberAccess.addGovernor(bob.address);
        await spcMemberAccess.addGovernor(rob.address);
        await spcMemberAccess.addGovernor(john.address);
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

      it('delegates provisioning Eth to the governor using the registry', async () => {
        // Add eth to the FAST contract.
        await ethers.provider.send("hardhat_setBalance", [access.address, toHexString(oneMilion)]);
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
        expect(subject).to.eq(2);
      });
    });

    describe('paginateMembers', async () => {
      beforeEach(async () => {
        // Add 4 members - so there is a total of 5.
        await governedAccess.addMember(alice.address);
        await governedAccess.addMember(bob.address);
        await governedAccess.addMember(rob.address);
        await governedAccess.addMember(john.address);
      });

      it('returns the cursor to the next page', async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [, cursor] = await access.paginateMembers(0, 3);
        expect(cursor).to.eq(3);
      });

      it('does not crash when overflowing and returns the correct cursor', async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [, cursor] = await access.paginateMembers(1, 10);
        expect(cursor).to.eq(5);
      });

      it('returns the governors in the order they were added', async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [values,] = await access.paginateMembers(0, 5);
        expect(values).to.be
          .ordered.members([
            governor.address,
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
      const { isGovernor, isMember } = await access.flags(governor.address);
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
