import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { Spc, Exchange, Fast, SpcFrontendFacet, FastFrontendFacet } from '../../typechain';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { BigNumber } from 'ethers';
import { FAST_INIT_DEFAULTS } from '../fixtures/fast';
import { spcFixtureFunc } from '../fixtures/spc';
import { ZERO_ADDRESS } from '../../src/utils';
chai.use(solidity);
chai.use(smock.matchers);

const FAST_DETAILS_DEFAULTS: FastFrontendFacet.DetailsStruct = {
  name: FAST_INIT_DEFAULTS.name,
  symbol: FAST_INIT_DEFAULTS.symbol,
  decimals: FAST_INIT_DEFAULTS.decimals,
  hasFixedSupply: FAST_INIT_DEFAULTS.hasFixedSupply,
  isSemiPublic: FAST_INIT_DEFAULTS.isSemiPublic,
  addr: ZERO_ADDRESS,
  totalSupply: BigNumber.from(20),
  transferCredits: BigNumber.from(30),
  reserveBalance: BigNumber.from(40),
  ethBalance: BigNumber.from(0),
  memberCount: BigNumber.from(1),
  governorCount: BigNumber.from(2)
};

describe('SpcFrontendFacet', () => {
  let
    deployer: Readonly<SignerWithAddress>,
    spcMember: Readonly<SignerWithAddress>,
    governor: Readonly<SignerWithAddress>;
  let
    exchange: Readonly<FakeContract<Exchange>>,
    fasts: ReadonlyArray<FakeContract<Fast>>;
  let
    spc: Readonly<Spc>,
    spcMemberSpc: Readonly<Spc>,
    frontend: Readonly<SpcFrontendFacet>;

  const spcDeployFixture = deployments.createFixture(spcFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, governor] = await ethers.getSigners();
  });

  beforeEach(async () => {
    await spcDeployFixture({
      opts: {
        name: 'SpcFrontendFixture',
        deployer: deployer.address,
        afterDeploy: async (res) => {
          spc = res.spc;
          spcMemberSpc = spc.connect(spcMember);
          frontend = await ethers.getContractAt<SpcFrontendFacet>('SpcFrontendFacet', res.spc.address);
          // Mock the Exchange.
          exchange = await smock.fake('Exchange');
          exchange.spcAddress.returns(res.spc.address);

          // Prepare a fake FAST.
          const values: Array<FakeContract<Fast>> = [];
          for (const index of [0, 1, 2]) {
            const fast = await smock.fake<Fast>('Fast');
            const symbol = `F0${index}`;
            fast.symbol.returns(symbol);
            fast.details.returns({ ...FAST_DETAILS_DEFAULTS, symbol });
            // Register the FAST.
            await spcMemberSpc.registerFast(fast.address);
            values.push(fast);
          }
          fasts = [...values];
        }
      },
      initWith: {
        member: spcMember.address
      }
    });
  });

  describe('paginateDetailedFasts', async () => {
    it('returns a paginated list of detailed FAST details', async () => {
      const [/*results*/, nextCursor] = await spcMemberSpc.paginateDetailedFasts(0, 5);
      for (const fast of fasts)
        expect(fast.details).to.have.been.calledOnceWith();
      expect(nextCursor).to.eq(3);
    });
  });
});
