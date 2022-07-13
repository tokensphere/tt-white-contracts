import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';
import { Spc, SpcAccessFacet } from '../../typechain';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { ContractTransaction } from 'ethers';
import { spcFixtureFunc } from '../fixtures/spc';
chai.use(solidity);
chai.use(smock.matchers);


describe('SpcInitFacet', () => {
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
        name: 'SpcInitFixture',
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

  describe('initialize', async () => {
    it('requires that it is not initialized');
    it('set various storage versions');
    it('registers supported interfaces');

    it('adds the given address to the member list', async () => {
      const subject = await access.isMember(spcMember.address);
      expect(subject).to.eq(true);
    });

    it('emits a MemberAdded event', async () => {
      await expect(initTx).to
        .emit(spc, 'MemberAdded')
        .withArgs(spcMember.address);
    });
  });
});
