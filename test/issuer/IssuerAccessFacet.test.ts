import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { smock, FakeContract } from '@defi-wonderland/smock';
import { Issuer, IssuerAccessFacet, Fast } from '../../typechain';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import {
  REQUIRES_ISSUER_MEMBERSHIP,
  REQUIRES_FAST_CONTRACT_CALLER,
  impersonateContract
} from '../utils';
import { ContractTransaction } from 'ethers';
import { issuerFixtureFunc } from '../fixtures/issuer';
chai.use(solidity);
chai.use(smock.matchers);


describe('IssuerAccessFacet', () => {
  let
    deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    bob: SignerWithAddress,
    alice: SignerWithAddress;
  let issuer: Issuer,
    fast: FakeContract<Fast>,
    issuerMemberIssuer: Issuer,
    initTx: ContractTransaction,
    access: IssuerAccessFacet,
    issuerMemberAccess: IssuerAccessFacet;

  const issuerDeployFixture = deployments.createFixture(issuerFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, bob, alice] = await ethers.getSigners();
    // Fake the FAST contract.
    fast = await smock.fake('Fast');
  });

  beforeEach(async () => {
    await issuerDeployFixture({
      opts: {
        name: 'IssuerAccessFixture',
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ issuer, initTx } = args)
          issuerMemberIssuer = issuer.connect(issuerMember);
          access = await ethers.getContractAt<IssuerAccessFacet>('IssuerAccessFacet', issuer.address);
          issuerMemberAccess = access.connect(issuerMember);
        }
      },
      initWith: {
        member: issuerMember.address
      }
    });
  });

  /// Membership management.

  describe('IHasMembers', async () => {
    describe('isMember', async () => {
      it('returns true when the candidate is a member', async () => {
        const subject = await access.isMember(issuerMember.address);
        expect(subject).to.eq(true);
      });

      it('returns false when the candidate is not a member', async () => {
        const subject = await access.isMember(bob.address);
        expect(subject).to.eq(false);
      });
    });

    describe('memberCount', async () => {
      beforeEach(async () => {
        await issuerMemberAccess.addMember(bob.address)
      });

      it('correctly counts members', async () => {
        const subject = await access.memberCount();
        expect(subject).to.eq(2);
      });
    });

    describe('paginateMembers', async () => {
      it('returns pages of members', async () => {
        await issuerMemberAccess.addMember(bob.address);
        await issuerMemberAccess.addMember(alice.address);

        const [members, /*nextCursor*/] = await access.paginateMembers(0, 3);
        expect(members).to.eql([issuerMember.address, bob.address, alice.address]);
      });
    });

    describe('addMember', async () => {
      it('requires that the sender is a member', async () => {
        const subject = access.addMember(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_ISSUER_MEMBERSHIP);
      });

      it('adds the member to the list', async () => {
        await issuerMemberAccess.addMember(bob.address);
        const subject = await issuer.isMember(bob.address);
        expect(subject).to.eq(true);
      });

      it('does not add the same member twice', async () => {
        const subject = issuerMemberAccess.addMember(issuerMember.address);
        await expect(subject).to.be
          .revertedWith('Address already in set');
      });

      it('emits a MemberAdded event', async () => {
        const subject = issuerMemberAccess.addMember(bob.address);
        await expect(subject).to
          .emit(issuer, 'MemberAdded')
          .withArgs(bob.address);
      });
    });

    describe('removeMember', async () => {
      beforeEach(async () => {
        await issuerMemberIssuer.addMember(bob.address);
      });

      it('requires that the sender is a member', async () => {
        const subject = access.removeMember(bob.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_ISSUER_MEMBERSHIP);
      });

      it('reverts when a member tries to removes themselves');

      it('removes the member from the list', async () => {
        await issuerMemberAccess.removeMember(bob.address);
        const subject = await issuer.isMember(bob.address);
        expect(subject).to.eq(false);
      });

      it('reverts if the member is not in the list', async () => {
        const subject = issuerMemberAccess.removeMember(alice.address);
        await expect(subject).to.be
          .revertedWith('Address does not exist in set');
      });

      it('emits a MemberRemoved event', async () => {
        const subject = issuerMemberAccess.removeMember(bob.address);
        await expect(subject).to
          .emit(issuer, 'MemberRemoved')
          .withArgs(bob.address);
      });
    });
  });

  /// Governorship tracking.

  describe('governorAddedToFast', async () => {
    it('requires the caller to be a registered FAST', async () => {
      const subject = issuer.governorAddedToFast(alice.address);
      await expect(subject).to.have.been
        .revertedWith(REQUIRES_FAST_CONTRACT_CALLER);
    });

    it('adds the given member to the FAST governorship tracking data structure', async () => {
      // This FAST is registered.
      await issuerMemberIssuer.registerFast(fast.address);

      // Call governorAddedToFast on the Issuer contract, as the FAST contract.
      const issuerAsFast = await impersonateContract(issuer, fast.address);
      issuerAsFast.governorAddedToFast(alice.address);

      // Expecting the FAST address to be included in FASTs Alice is a governor of.
      const [subject, /* nextCursor */] = await access.paginateGovernorships(alice.address, 0, 10);
      expect(subject).to.be.eql([
        fast.address
      ]);
    });
  });

  describe('governorRemovedFromFast', async () => {
    it('requires the caller to be a registered FAST', async () => {
      const subject = issuer.governorAddedToFast(alice.address);
      await expect(subject).to.have.been
        .revertedWith(REQUIRES_FAST_CONTRACT_CALLER);
    });

    it('adds the given member to the FAST governorship tracking data structure', async () => {
      // This FAST is registered.
      await issuerMemberIssuer.registerFast(fast.address);

      // Impersonate the FAST contract.
      const issuerAsFast = await impersonateContract(issuer, fast.address);

      // Add then remove Alice.
      issuerAsFast.governorAddedToFast(alice.address);
      issuerAsFast.governorRemovedFromFast(alice.address);

      // Expecting the FAST address to not be included in FASTs Alice is a governor of.
      const [subject, /* nextCursor */] = await access.paginateGovernorships(alice.address, 0, 10);
      expect(subject).to.be.empty;
    });
  });

  describe('paginateGovernorships', async () => {
    beforeEach(async () => {
      // This FAST is registered.
      await issuerMemberIssuer.registerFast(fast.address);

      // Add Alice as a governor to the FAST.
      const issuerAsFast = await impersonateContract(issuer, fast.address);
      await issuerAsFast.governorAddedToFast(alice.address);
    });

    it('given an address, returns the list of FASTs that it is a governor of', async () => {
      const [subject, /* nextCursor */] = await access.paginateGovernorships(alice.address, 0, 10)
      expect(subject).to.be.eql([
        fast.address
      ]);
    });
  });
});