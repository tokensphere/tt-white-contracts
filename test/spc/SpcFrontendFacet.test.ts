import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { Spc, Exchange, SpcInitFacet, Fast } from '../../typechain';
import { DEPLOYER_FACTORY_COMMON } from '../../src/utils';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { BigNumber } from 'ethers';
chai.use(solidity);
chai.use(smock.matchers);

interface FastFixtureOpts {
  // Ops variables.
  deployer: string;
  governor: string;
  exchange: string;
  // Config.
  spc: string;
  name: string;
  symbol: string;
  decimals: BigNumber;
  hasFixedSupply: boolean;
  isSemiPublic: boolean;
}

interface Details {
  addr: string;
  name: string;
  symbol: string;
  decimals: BigNumber;
  totalSupply: BigNumber;
  transferCredits: BigNumber;
  isSemiPublic: boolean;
  hasFixedSupply: boolean;
  reserveBalance: BigNumber;
  memberCount: BigNumber;
  governorCount: BigNumber;
}

interface SpcFixtureOpts {
  // Ops variables.
  deployer: string;
  // Config.
  member: string;
}

const FAST_FACETS = ['FastTopFacet', 'FastHistoryFacet', 'FastTokenFacet', 'FastFrontendFacet'];

const fastDeployFixture = deployments.createFixture(async (hre, uOpts) => {
  const initOpts = uOpts as FastFixtureOpts;
  const { deployer, ...initFacetArgs } = initOpts;
  // Deploy the diamond.
  return await deployments.diamond.deploy('FastSpcFrontendFacet', {
    from: initOpts.deployer,
    owner: initOpts.deployer,
    facets: FAST_FACETS,
    execute: {
      contract: 'FastInitFacet',
      methodName: 'initialize',
      args: [initFacetArgs],
    },
    deterministicSalt: DEPLOYER_FACTORY_COMMON.salt
  });
});

const SPC_FACETS = ['SpcTopFacet', 'SpcFrontendFacet'];

const spcDeployFixture = deployments.createFixture(async (hre, uOpts) => {
  const initOpts = uOpts as SpcFixtureOpts;
  const { deployer, ...initFacetOpts } = initOpts;
  // Deploy the diamond.
  const deploy = await deployments.diamond.deploy('SpcFrontendFacet', {
    from: initOpts.deployer,
    owner: initOpts.deployer,
    facets: [...SPC_FACETS, 'SpcInitFacet'],
    deterministicSalt: DEPLOYER_FACTORY_COMMON.salt
  });

  // Initialize the diamond. We are doing it in two steps, because the SPC member is different
  // in each environment, and this would make our deployment transaction different in each and
  // therefore defeat the deterministic deployment strategy.
  const init = await ethers.getContractAt('SpcInitFacet', deploy.address) as SpcInitFacet;
  await init.initialize(initFacetOpts);

  return deploy;
});

describe('SpcFrontendFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    governor: SignerWithAddress;
  let
    spc: Spc,
    spcMemberSpc: Spc;
  let fast: Fast;
  let exchange: FakeContract<Exchange>;

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, governor] = await ethers.getSigners();

    // Deploy the SPC.
    let spcInitOpts: SpcFixtureOpts = {
      deployer: deployer.address,
      member: spcMember.address,
    };
    const spcDeploy = await spcDeployFixture(spcInitOpts);

    spc = await ethers.getContractAt('Spc', spcDeploy.address) as Spc;
    spcMemberSpc = spc.connect(spcMember);

    // Mock the Exchange.
    exchange = await smock.fake('Exchange');
    exchange.spcAddress.returns(spc.address);

    // Deploy the FAST.
    let initOpts: FastFixtureOpts = {
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
    fast = await ethers.getContractAt('Fast', deploy.address) as Fast;

    // Register the FAST.
    await spcMemberSpc.registerFast(fast.address);
  });

  describe('paginateDetailedFasts', async () => {
    it('returns a paginated list of detailed FAST details', async () => {
      // Get the detailed list of FASTs.
      const cursor = BigNumber.from(0);
      const perPage = BigNumber.from(5);
      const subject = await spcMemberSpc.paginateDetailedFasts(cursor, perPage);

      let details: Details;
      let page;
      [[details], page] = subject;

      // Member details.
      expect(details.addr).to.eq(fast.address);
      expect(details.name).to.eq("Better, Stronger, FASTer");
      expect(details.symbol).to.eq("BSF");
      expect(details.decimals).to.eq(18);
      expect(details.totalSupply).to.eq(0);
      expect(details.transferCredits).to.eq(0);
      expect(details.isSemiPublic).to.eq(true);
      expect(details.hasFixedSupply).to.eq(true);
      expect(details.reserveBalance).to.eq(0);
      expect(details.memberCount).to.eq(0);
      expect(details.governorCount).to.eq(1);

      // Page 1.
      expect(page).to.eq(1);
    });
  });
});
