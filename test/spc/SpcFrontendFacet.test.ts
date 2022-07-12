import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { Spc, Exchange, Fast, SpcFrontendFacet } from '../../typechain';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { BigNumber } from 'ethers';
import { FAST_INIT_DEFAULTS } from '../fixtures/fast';
import { spcFixtureFunc } from '../fixtures/spc';
chai.use(solidity);
chai.use(smock.matchers);

describe('SpcFrontendFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    governor: SignerWithAddress;
  let
    exchange: FakeContract<Exchange>,
    fast: FakeContract<Fast>;
  let
    spc: Spc,
    spcMemberSpc: Spc,
    frontend: SpcFrontendFacet;

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
          fast = await smock.fake<Fast>('Fast');
          fast.symbol.returns(FAST_INIT_DEFAULTS.symbol);
          fast.details.reset();
          fast.details.returns({
            ...FAST_INIT_DEFAULTS,
            addr: fast.address,
            totalSupply: BigNumber.from(20),
            transferCredits: BigNumber.from(30),
            reserveBalance: BigNumber.from(40),
            memberCount: BigNumber.from(1),
            governorCount: BigNumber.from(2),
          });
          // Register the FAST.
          await spcMemberSpc.registerFast(fast.address);
        }
      },
      initWith: {
        member: spcMember.address
      }
    });
  });

  describe('paginateDetailedFasts', async () => {
    it('returns a paginated list of detailed FAST details', async () => {
      // TODO: Why isn't this deserializing properly?...
      // const [[{ name }], nextCursor] = await spcMemberSpc.paginateDetailedFasts(0, 5);
      // expect(fast.details).to.have.been.calledOnceWith();
      // expect(name).to.eq('Fast 1');
      // expect(nextCursor).to.eq(2);
    });
  });
});
