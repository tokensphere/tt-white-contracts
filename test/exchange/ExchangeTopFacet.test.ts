import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { Spc, ExchangeTopFacet } from '../../typechain';
import { EXCHANGE_FACETS } from '../../tasks/exchange';
import { deploymentSalt } from '../../src/utils';
chai.use(solidity);
chai.use(smock.matchers);

const FAST_FIXTURE_NAME = 'ExchangeTopFixture';

interface ExchangeFixtureOpts {
  // Ops variables.
  deployer: string;
  // Config.
  spc: string;
}

const exchangeDeployFixture = deployments.createFixture(async (hre, uOpts) => {
  const initOpts = uOpts as ExchangeFixtureOpts;
  const { deployer, ...initFacetOpts } = initOpts;
  // Deploy the diamond.
  return await deployments.diamond.deploy(FAST_FIXTURE_NAME, {
    from: initOpts.deployer,
    owner: initOpts.deployer,
    facets: EXCHANGE_FACETS,
    execute: {
      contract: 'ExchangeInitFacet',
      methodName: 'initialize',
      args: [initFacetOpts]
    },
    deterministicSalt: deploymentSalt(hre)
  });
});

describe('ExchangeTopFacet', () => {
  let deployer: SignerWithAddress;
  let spc: FakeContract<Spc>,
    exchange: ExchangeTopFacet;

  before(async () => {
    // Keep track of a few signers.
    [deployer] = await ethers.getSigners();
    // Mock an SPC contract.
    spc = await smock.fake('Spc');
  });

  beforeEach(async () => {
    const initOpts: ExchangeFixtureOpts = {
      deployer: deployer.address,
      spc: spc.address,
    };
    await exchangeDeployFixture(initOpts);
    exchange = await ethers.getContract<ExchangeTopFacet>(FAST_FIXTURE_NAME);
  });

  describe('spcAddress', async () => {
    it('returns the SPC address', async () => {
      const subject = await exchange.spcAddress();
      expect(subject).to.eq(spc.address);
    });
  });
});
