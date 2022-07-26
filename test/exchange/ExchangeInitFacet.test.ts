import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { Spc, ExchangeTopFacet, Exchange, ExchangeInitFacet } from '../../typechain';
import { exchangeFixtureFunc } from '../fixtures/exchange';
import { BigNumber } from 'ethers';
import { ALREADY_INITIALIZED, impersonateContract } from '../utils';
import { DEPLOYER_FACTORY_COMMON } from '../../src/utils';
chai.use(solidity);
chai.use(smock.matchers);


describe('ExchangeInitFacet', () => {
  let deployer: SignerWithAddress;
  let spc: FakeContract<Spc>,
    exchange: Exchange,
    top: ExchangeTopFacet;

  const exchangeDeployFixture = deployments.createFixture(exchangeFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer] = await ethers.getSigners();
    // Mock an SPC contract.
    spc = await smock.fake('Spc');
  });

  beforeEach(async () => {
    await exchangeDeployFixture({
      opts: {
        name: 'ExchangeInitFixture',
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ exchange } = args);
          top = await ethers.getContractAt<ExchangeTopFacet>('ExchangeTopFacet', exchange.address);
        }
      },
      initWith: {
        spc: spc.address
      }
    });
  });

  describe('initialize', async () => {
    it('requires that it is not initialized', async () => {
      // Attempt to re-initialize.
      const exchangeInit = await ethers.getContractAt<ExchangeInitFacet>('ExchangeInitFacet', exchange.address);
      const exchangeInitAsItself = await impersonateContract(exchangeInit, DEPLOYER_FACTORY_COMMON.factory);
      const subject = exchangeInitAsItself.initialize({
        spc: spc.address
      });

      await expect(subject).to.be
        .revertedWith(ALREADY_INITIALIZED);
    });

    it('set various storage versions', async () => {
      // Query the slot and parse out the STORAGE_VERSION.
      const slot = ethers.utils.solidityKeccak256(['string'], ['Exchange.storage']);
      const data = await ethers.provider.send('eth_getStorageAt', [exchange.address, slot, 'latest']);
      // Slice out the final 2 bytes to get the version.
      const subject = ethers.utils.hexDataSlice(data, 30, 32);

      // Expectations.
      expect(BigNumber.from(subject).toString()).to.eq('1');
    });

    it('registers supported interfaces', async () => {
      expect({
        IERC165: await exchange.supportsInterface('0x01ffc9a7'),
        IERC173: await exchange.supportsInterface('0x7f5828d0'),
        IDiamondCut: await exchange.supportsInterface('0x1f931c1c'),
        IDiamondLoupe: await exchange.supportsInterface('0x48e2b093'),
        IHasMembers: await exchange.supportsInterface('0xb4bb4f46'),
        ITokenHoldings: await exchange.supportsInterface('0xc1da5b0c')
      }).to.be.eql({
        IERC165: true,
        IERC173: true,
        IDiamondCut: true,
        IDiamondLoupe: true,
        IHasMembers: true,
        ITokenHoldings: true
      })
    });

    it('stores the given SPC address', async () => {
      // Querying the SPC address via the ExchangeTopFacet should return the stored address.
      const subject = await top.spcAddress();
      expect(subject).to.be.eq(spc.address);
    });
  });
});
