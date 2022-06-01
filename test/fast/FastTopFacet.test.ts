import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { negOne, one, oneMillion, REQUIRES_FAST_GOVERNORSHIP, REQUIRES_SPC_MEMBERSHIP } from '../utils';
import { DEPLOYER_FACTORY_COMMON, toHexString } from '../../src/utils';
import { Spc, Exchange, Fast, FastTopFacet, FastInitFacet, FastTokenFacet, FastAccessFacet } from '../../typechain';
chai.use(solidity);
chai.use(smock.matchers);

const FAST_FIXTURE_NAME = 'FastFixture';

interface FastFixtureOpts {
  // Ops variables.
  deployer: string;
  governor: string;
  exchange: string;
  // Config.
  spc: string,
  name: string;
  symbol: string;
  decimals: BigNumber;
  hasFixedSupply: boolean;
  isSemiPublic: boolean;
}

const FAST_FACETS = ['FastTopFacet', 'FastAccessFacet'];

const fastDeployFixture = deployments.createFixture(async (hre, uOpts) => {
  const initOpts = uOpts as FastFixtureOpts;
  // Deploy the diamond.
  const deploy = await deployments.diamond.deploy(FAST_FIXTURE_NAME, {
    from: initOpts.deployer,
    owner: initOpts.deployer,
    facets: [...FAST_FACETS, 'FastInitFacet'],
    deterministicSalt: DEPLOYER_FACTORY_COMMON.salt
  });

  // Call the initialization facet.
  const init = await ethers.getContractAt('FastInitFacet', deploy.address) as FastInitFacet;
  await init.initialize(initOpts);

  // Remove the initialization facet.
  await deployments.diamond.deploy(FAST_FIXTURE_NAME, {
    from: initOpts.deployer,
    owner: initOpts.deployer,
    facets: FAST_FACETS,
    deterministicSalt: DEPLOYER_FACTORY_COMMON.salt
  });

  return deploy;
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
    access: FastAccessFacet,
    governedAccess: FastAccessFacet,
    spcMemberAccess: FastAccessFacet;


  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, governor, alice, bob, rob, john] = await ethers.getSigners();
    // Mock an SPC and an Exchange contract.
    spc = await smock.fake('Spc');
    exchange = await smock.fake('Exchange');
    exchange.spcAddress.returns(spc.address);
  });

  beforeEach(async () => {
    spc.isMember.whenCalledWith(spcMember.address).returns(true);
    spc.isMember.returns(false);

    const initOpts: FastFixtureOpts = {
      deployer: deployer.address,
      governor: governor.address,
      exchange: exchange.address,
      spc: spc.address,
      name: 'Better, Stronger, FASTer',
      symbol: 'BSF',
      decimals: BigNumber.from(18),
      hasFixedSupply: true,
      isSemiPublic: true
    };
    const deploy = await fastDeployFixture(initOpts);
    const fast = await ethers.getContractAt('Fast', deploy.address) as Fast;

    // TODO: Once smock fixes their stuff. replace facets by fakes.

    access = fast as FastAccessFacet;
    governedAccess = access.connect(governor);
    spcMemberAccess = access.connect(spcMember);
  });

  describe('provisionWithEth', async () => {
    it('NEEDS MORE TESTS');
  });

  describe('drainEth', async () => {
    it('NEEDS MORE TESTS');
  });

  describe('payUpTo', async () => {
    it('NEEDS MORE TESTS');
  });
});
