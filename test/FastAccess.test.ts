import * as chai from 'chai';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Spc, FastAccess__factory, FastAccess, FastRegistry, FastToken } from '../typechain-types';
import { one, ten } from './utils';
chai.use(smock.matchers);

describe('FastAccess', () => {
  let
    spcMember: SignerWithAddress,
    governor: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    rob: SignerWithAddress,
    john: SignerWithAddress;
  let spc: FakeContract<Spc>,
    reg: FakeContract<FastRegistry>,
    token: FakeContract<FastToken>,
    accessFactory: FastAccess__factory,
    access: FastAccess,
    governedAccess: FastAccess,
    spcMemberAccess: FastAccess;

  before(async () => {
    // Keep track of a few signers.
    [/*deployer*/, spcMember, governor, alice, bob, rob, john] = await ethers.getSigners();

    // Deploy the libraries we need.
    const addressSetLib = await (await ethers.getContractFactory('AddressSetLib')).deploy();
    const paginationLib = await (await ethers.getContractFactory('PaginationLib')).deploy();

    // Mock an SPC, Token and Registry contracts.
    spc = await smock.fake('Spc');
    token = await smock.fake('FastToken');
    reg = await smock.fake('FastRegistry');

    // Set up our mocks.
    reg.spc.returns(spc.address);
    reg.token.returns(token.address);

    // Finally create and cache our access factory.
    const accessLibs = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address };
    accessFactory = await ethers.getContractFactory('FastAccess', { libraries: accessLibs });
  });

  beforeEach(async () => {
    // Reset mocks.
    reg.payUpTo.reset();
    spc.isMember.reset();
    token.beforeRemovingMember.reset();
    // Setup mocks.
    spc.isMember.returns(false);
    spc.isMember.whenCalledWith(spcMember.address).returns(true);

    // Spin up our Access contract.
    access = await upgrades.deployProxy(accessFactory, [reg.address, governor.address]) as FastAccess;
    governedAccess = access.connect(governor);
    spcMemberAccess = access.connect(spcMember);
  });

  /// Public stuff.

  describe('initialize', async () => {
    it('keeps track of the Registry address', async () => {
      const subject = await access.reg();
      expect(subject).to.eq(reg.address);
    });

    it('adds the governor parameter as a member', async () => {
      const subject = await access.isMember(governor.address);
      expect(subject).to.eq(true);
    });

    it('adds the governor parameter as a governor', async () => {
      const subject = await access.isGovernor(governor.address);
      expect(subject).to.eq(true);
    });

    it('emits a GovernorAdded and a MemberAdded event', async () => {
      // Since we cannot get the transaction of a proxy-deployed contract
      // via `upgrades.deployProxy`, we will deploy it manually and call its
      // initializer.
      const contract = await accessFactory.deploy();
      const subject = contract.initialize(reg.address, governor.address);
      await expect(subject).to
        .emit(contract, 'GovernorAdded')
        .withArgs(governor.address);
      await expect(subject).to
        .emit(contract, 'MemberAdded')
        .withArgs(governor.address);
    });
  });

  /// Public member getters.

  describe('reg', async () => {
    it('returns the registry address', async () => {
      const subject = await access.reg();
      expect(subject).to.eq(reg.address);
    });
  });

  /// Governorship related stuff.

  describe('IHasGovernors implementation', async () => {
    describe('addGovernor', async () => {
      it('requires SPC membership (anonymous)', async () => {
        const subject = access.addGovernor(alice.address);
        // Check that the registry
        await expect(subject).to.have
          .revertedWith('Missing SPC membership');
      });

      it('requires SPC membership (governor)', async () => {
        const subject = governedAccess.addGovernor(alice.address);
        await expect(subject).to.have
          .revertedWith('Missing SPC membership');
      });

      it('requires that the address is not a governor yet', async () => {
        await spcMemberAccess.addGovernor(alice.address)
        const subject = spcMemberAccess.addGovernor(alice.address);
        await expect(subject).to.have
          .revertedWith('Address already in set');
      });

      it('adds the given address as a governor', async () => {
        await spcMemberAccess.addGovernor(alice.address);
        const subject = await access.isGovernor(alice.address);
        expect(subject).to.eq(true);
      });

      it('delegates provisioning Eth to the governor using the registry', async () => {
        await spcMemberAccess.addGovernor(alice.address);
        expect(reg.payUpTo).to.have.been
          .calledOnceWith(alice.address, ten);
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
        await expect(subject).to.have
          .revertedWith('Missing SPC membership');
      });

      it('requires SPC membership (governor)', async () => {
        const subject = governedAccess.removeGovernor(alice.address);
        await expect(subject).to.have
          .revertedWith('Missing SPC membership');
      });

      it('requires that the address is an existing governor', async () => {
        const subject = spcMemberAccess.removeGovernor(bob.address);
        await expect(subject).to.have
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
        expect(values).to.have.ordered.members([
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
        await expect(subject).to.have
          .revertedWith('Missing governorship');
      });

      it('requires governance (SPC governor)', async () => {
        const subject = spcMemberAccess.addMember(alice.address);
        await expect(subject).to.have
          .revertedWith('Missing governorship');
      });

      it('requires that the address is not a member yet', async () => {
        await governedAccess.addMember(alice.address)
        const subject = governedAccess.addMember(alice.address);
        await expect(subject).to.have
          .revertedWith('Address already in set');
      });

      it('adds the given address as a member', async () => {
        await governedAccess.addMember(alice.address);
        const subject = await access.isMember(alice.address);
        expect(subject).to.eq(true);
      });

      it('delegates provisioning Eth to the governor using the registry', async () => {
        await governedAccess.addMember(alice.address);
        expect(reg.payUpTo).to.have.been
          .calledOnceWith(alice.address, one);
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
        await expect(subject).to.have
          .revertedWith('Missing governorship');
      });

      it('requires governance (SPC governor)', async () => {
        const subject = spcMemberAccess.removeMember(alice.address);
        await expect(subject).to.have
          .revertedWith('Missing governorship');
      });

      it('requires that the address is an existing member', async () => {
        const subject = governedAccess.removeMember(bob.address);
        await expect(subject).to.have
          .revertedWith('Address does not exist in set');
      });

      it('removes the given address as a member', async () => {
        await governedAccess.removeMember(alice.address);
        const subject = await access.isMember(alice.address);
        expect(subject).to.eq(false);
      });

      it('delegates to the token contract', async () => {
        await governedAccess.removeMember(alice.address);
        expect(token.beforeRemovingMember).to.have.been
          .calledOnceWith(alice.address);
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
        expect(values).to.have.ordered.members([
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
