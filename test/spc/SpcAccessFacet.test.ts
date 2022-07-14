import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';
import { Spc, SpcAccessFacet } from '../../typechain';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { toUnpaddedHexString } from '../../src/utils';
import {
  negNine, negTen, negTwo, nine, one, REQUIRES_SPC_MEMBERSHIP, ten, two
} from '../utils';
import { ContractTransaction } from 'ethers';
import { spcFixtureFunc } from '../fixtures/spc';
chai.use(solidity);
chai.use(smock.matchers);


describe('SpcAccessFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    bob: SignerWithAddress,
    alice: SignerWithAddress;
  let spc: Spc,
    spcMemberSpc: Spc,
    initTx: ContractTransaction,
    access: SpcAccessFacet,
    spcMemberAccess: SpcAccessFacet;

  const spcDeployFixture = deployments.createFixture(spcFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, bob, alice] = await ethers.getSigners();
  });

  beforeEach(async () => {
    await spcDeployFixture({
      opts: {
        name: 'SpcAccessFixture',
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ spc, initTx } = args)
          spcMemberSpc = spc.connect(spcMember);
          access = await ethers.getContractAt<SpcAccessFacet>('SpcAccessFacet', spc.address);
          spcMemberAccess = access.connect(spcMember);
        }
      },
      initWith: {
        member: spcMember.address
      }
    });
  });

  /// Membership management.

  describe('IHasMembers', async () => {
    describe('isMember', async () => {
      it('returns true when the candidate is a member', async () => {
        const subject = await access.isMember(spcMember.address);
        expect(subject).to.eq(true);
      });

      it('returns false when the candidate is not a member', async () => {
        const subject = await access.isMember(bob.address);
        expect(subject).to.eq(false);
      });
    });

    describe('memberCount', async () => {
      beforeEach(async () => {
        await spcMemberAccess.addMember(bob.address)
      });

      it('correctly counts members', async () => {
        const subject = await access.memberCount();
        expect(subject).to.eq(2);
      });
    });

    describe('paginateMembers', async () => {
      it('returns pages of members', async () => {
        await spcMemberAccess.addMember(bob.address);
        await spcMemberAccess.addMember(alice.address);

        const [members, /*nextCursor*/] = await access.paginateMembers(0, 3);
        expect(members).to.eql([spcMember.address, bob.address, alice.address]);
      });
    });

    describe('addMember', async () => {
      it('requires that the sender is a member', async () => {
        const subject = access.addMember(alice.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_SPC_MEMBERSHIP);
      });

      it('adds the member to the list', async () => {
        await spcMemberAccess.addMember(bob.address);
        const subject = await spc.isMember(bob.address);
        expect(subject).to.eq(true);
      });

      it('does not add the same member twice', async () => {
        const subject = spcMemberAccess.addMember(spcMember.address);
        await expect(subject).to.be
          .revertedWith('Address already in set');
      });

      it('provisions the member with 10 Eth', async () => {
        await ethers.provider.send("hardhat_setBalance", [bob.address, '0x0']);
        // Do it!
        const subject = async () => await spcMemberAccess.addMember(bob.address);
        // Check balances.
        await expect(subject).to.changeEtherBalances([spc, bob], [negTen, ten]);
      });

      it('only tops-up the member if they already have eth', async () => {
        await ethers.provider.send("hardhat_setBalance", [bob.address, toUnpaddedHexString(one)]);
        // Do it!
        const subject = async () => await spcMemberAccess.addMember(bob.address);
        // Check balances.
        await expect(subject).to.changeEtherBalances([spc, bob], [negNine, nine]);
      });

      it('only provisions the member up to the available balance', async () => {
        await ethers.provider.send("hardhat_setBalance", [spc.address, toUnpaddedHexString(two)]);
        await ethers.provider.send("hardhat_setBalance", [bob.address, '0x0']);
        // Do it!
        const subject = async () => await spcMemberAccess.addMember(bob.address);
        // Check balances.
        await expect(subject).to.changeEtherBalances([spc, bob], [negTwo, two]);
      });

      it('emits a MemberAdded event', async () => {
        const subject = spcMemberAccess.addMember(bob.address);
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
        const subject = access.removeMember(bob.address);
        await expect(subject).to.be
          .revertedWith(REQUIRES_SPC_MEMBERSHIP);
      });

      it('reverts when a member tries to removes themselves');

      it('removes the member from the list', async () => {
        await spcMemberAccess.removeMember(bob.address);
        const subject = await spc.isMember(bob.address);
        expect(subject).to.eq(false);
      });

      it('reverts if the member is not in the list', async () => {
        const subject = spcMemberAccess.removeMember(alice.address);
        await expect(subject).to.be
          .revertedWith('Address does not exist in set');
      });

      it('emits a MemberRemoved event', async () => {
        const subject = spcMemberAccess.removeMember(bob.address);
        await expect(subject).to
          .emit(spc, 'MemberRemoved')
          .withArgs(bob.address);
      });
    });
  });
});
