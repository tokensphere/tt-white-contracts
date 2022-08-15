import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';
import { Issuer, IssuerAccessFacet } from '../../typechain';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { toUnpaddedHexString } from '../../src/utils';
import {
  negNine, negTen, negTwo, nine, one, REQUIRES_ISSUER_MEMBERSHIP, ten, two
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
    issuerMemberIssuer: Issuer,
    initTx: ContractTransaction,
    access: IssuerAccessFacet,
    issuerMemberAccess: IssuerAccessFacet;

  const issuerDeployFixture = deployments.createFixture(issuerFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, bob, alice] = await ethers.getSigners();
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
});
