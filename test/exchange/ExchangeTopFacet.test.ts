import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { Spc, ExchangeTopFacet, Exchange } from '../../typechain';
import { exchangeFixtureFunc } from '../fixtures/exchange';
chai.use(solidity);
chai.use(smock.matchers);


describe('ExchangeTopFacet', () => {
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
        name: 'ExchangeTopFixture',
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

  describe('spcAddress', async () => {
    it('returns the SPC address', async () => {
      const subject = await exchange.spcAddress();
      expect(subject).to.eq(spc.address);
    });
  });
});
