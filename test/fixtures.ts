import * as chai from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';
import { Fast, FastInitFacet } from '../typechain';
import { BigNumber } from 'ethers';
chai.use(solidity);
chai.use(smock.matchers);

const FAST_FACETS = [
  'FastFacet',
  'FastAccessFacet',
  'FastTokenFacet',
  'FastHistoryFacet'
];

interface FastFixtureOpts {
  // Ops variables.
  deployer: string;
  spcMember: string;
  governor: string;
  spc: string;
  exchange: string;
  // Config.
  name: string;
  symbol: string;
  decimals: BigNumber;
  hasFixedSupply: boolean;
  isSemiPublic: boolean;
}

const fastFixture = deployments.createFixture(async (hre, unknownOpts) => {
  const opts = unknownOpts as FastFixtureOpts;
  // Deploy the fast with an additional initialization facet.
  const { address: fastAddr } = await deployments.diamond.deploy('Fast', {
    from: opts.deployer,
    owner: opts.deployer,
    facets: ['FastInitFacet', ...FAST_FACETS],
    log: true
  });

  // Grab a handle to the diamond's token facet.
  const fast = await ethers.getContractAt('Fast', fastAddr) as Fast;
  const init = await ethers.getContractAt('FastInitFacet', fastAddr) as FastInitFacet;

  // Call the initialization facet.
  await init.initialize(opts);

  // Perform a diamond cut to subtract the initialization facet.
  await deployments.diamond.deploy('Fast', { from: opts.deployer, owner: opts.deployer, facets: FAST_FACETS, });
  // Swap something.
  const tokenFake = await smock.fake('FastTokenFacet', { address: opts.deployer });
  console.log(tokenFake);

  return fast;
});

export { fastFixture };
