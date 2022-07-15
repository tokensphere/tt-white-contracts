import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';
import { Spc, SpcAccessFacet, SpcInitFacet } from '../../typechain';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { BigNumber, ContractTransaction } from 'ethers';
import { spcFixtureFunc } from '../fixtures/spc';
import { ALREADY_INITIALIZED } from '../utils';
import { ZERO_ADDRESS } from '../../src/utils';
chai.use(solidity);
chai.use(smock.matchers);


describe('SpcInitFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress;
  let spc: Spc,
    initTx: ContractTransaction,
    access: SpcAccessFacet;

  const spcDeployFixture = deployments.createFixture(spcFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember] = await ethers.getSigners();
  });

  beforeEach(async () => {
    await spcDeployFixture({
      opts: {
        name: 'SpcInitFixture',
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ spc, initTx } = args)
          access = await ethers.getContractAt<SpcAccessFacet>('SpcAccessFacet', spc.address);
        }
      },
      initWith: {
        member: spcMember.address
      }
    });
  });

  describe('initialize', async () => {
    it('requires that it is not initialized', async () => {
      // Attempt to re-initialize.
      const initSpc = await ethers.getContractAt<SpcInitFacet>('SpcInitFacet', spc.address);
      const subject = initSpc.initialize({
        member: ZERO_ADDRESS
      });
      await expect(subject).to.be
        .revertedWith(ALREADY_INITIALIZED);
    });

    it('set various storage versions', async () => {
      // Query the slot and parse out the STORAGE_VERSION.
      const slot = ethers.utils.solidityKeccak256(['string'], ['Spc.storage']);
      const subject = await ethers.provider.send('eth_getStorageAt', [spc.address, slot, 'latest']);
      // Expectations.
      expect(BigNumber.from(subject).toString()).to.eq('1');
    });

    it('registers supported interfaces', async () => {
      expect({
        IERC165: await spc.supportsInterface('0x01ffc9a7'),
        IERC173: await spc.supportsInterface('0x7f5828d0'),
        IDiamondCut: await spc.supportsInterface('0x1f931c1c'),
        IDiamondLoupe: await spc.supportsInterface('0x48e2b093'),
        IHasMembers: await spc.supportsInterface('0xb4bb4f46'),
      }).to.be.eql({
        IERC165: true,
        IERC173: true,
        IDiamondCut: true,
        IDiamondLoupe: true,
        IHasMembers: true
      })
    });

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
