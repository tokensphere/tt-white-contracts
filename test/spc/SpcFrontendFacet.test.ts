import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { Spc, Exchange, SpcInitFacet, Fast } from '../../typechain';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { BigNumber } from 'ethers';
import { FAST_INIT_DEFAULTS } from '../fast/utils';
chai.use(solidity);
chai.use(smock.matchers);


interface SpcFixtureOpts {
  // Ops variables.
  deployer: string;
  // Config.
  member: string;
}

const SPC_FACETS = ['SpcTopFacet', 'SpcAccessFacet', 'SpcFrontendFacet'];

const spcDeployFixture = deployments.createFixture(async (hre, uOpts) => {
  const initOpts = uOpts as SpcFixtureOpts;
  const { deployer, ...initFacetOpts } = initOpts;
  // Deploy the diamond.
  const deploy = await deployments.diamond.deploy('SpcFrontendFixture', {
    from: initOpts.deployer,
    owner: initOpts.deployer,
    facets: [...SPC_FACETS, 'SpcInitFacet']
  });

  // Initialize the diamond. We are doing it in two steps, because the SPC member is different
  // in each environment, and this would make our deployment transaction different in each and
  // therefore defeat the deterministic deployment strategy.
  const init = await ethers.getContractAt<SpcInitFacet>('SpcInitFacet', deploy.address);
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
  let
    exchange: FakeContract<Exchange>,
    fast1: FakeContract<Fast>,
    fast2: FakeContract<Fast>;

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
    // Mock a FAST.
    [fast1, fast2] = await Promise.all([1, 2].map(async (id) => {
      const fast = await smock.fake<Fast>('Fast');
      const symbol = `F0${id}`;
      fast.symbol.returns(symbol);
      fast.details.returns({
        ...FAST_INIT_DEFAULTS,
        addr: fast.address,
        name: `Fast ${id}`,
        symbol: symbol,
        totalSupply: BigNumber.from(20),
        transferCredits: BigNumber.from(30),
        reserveBalance: BigNumber.from(40),
        memberCount: BigNumber.from(1),
        governorCount: BigNumber.from(2),
      });
      // Register the FAST.
      await spcMemberSpc.registerFast(fast.address);
      return fast;
    }))
  });

  describe('paginateDetailedFasts', async () => {
    it('returns a paginated list of detailed FAST details', async () => {
      // Get the detailed list of FASTs.
      const [[{ name: f1Name }, { name: f2Name }], nextCursor] = await spcMemberSpc.paginateDetailedFasts(0, 5);

      expect(fast1.details).to.have.been.calledOnceWith();
      expect(f1Name).to.eq('Fast 1');

      expect(fast2.details).to.have.been.calledOnceWith();
      expect(f2Name).to.eq('Fast 2');

      expect(nextCursor).to.eq(2);
    });
  });
});
