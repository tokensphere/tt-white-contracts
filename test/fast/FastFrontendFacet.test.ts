import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { tenThousand } from '../utils';
import { DEPLOYER_FACTORY_COMMON } from '../../src/utils';
import { Spc, Exchange, Fast } from '../../typechain';
chai.use(solidity);
chai.use(smock.matchers);

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

const FAST_FACETS = ['FastTopFacet', 'FastAccessFacet', 'FastFrontendFacet'];

const fastDeployFixture = deployments.createFixture(async (hre, uOpts) => {
  const initOpts = uOpts as FastFixtureOpts;
  const { deployer, ...initFacetArgs } = initOpts;
  // Deploy the diamond.
  return await deployments.diamond.deploy('FastBSF', {
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

describe('FastFrontendFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    governor: SignerWithAddress,
    member: SignerWithAddress;
  let spc: FakeContract<Spc>,
    exchange: FakeContract<Exchange>,
    fast: Fast,
    spcMemberFast: Fast;

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, governor, member] = await ethers.getSigners();
    // Mock an SPC and an Exchange contract.
    spc = await smock.fake('Spc');
    exchange = await smock.fake('Exchange');
    spc.isMember.whenCalledWith(spcMember.address).returns(true);
    spc.isMember.returns(false);
    exchange.spcAddress.returns(spc.address);
    exchange.isMember.whenCalledWith(member.address).returns(true);
    exchange.isMember.returns(false);
  });

  // TODO: We probably want to have at least two members added, and have their balances
  // and details different so that we can check that the population of the structs is correct.
  beforeEach(async () => {
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
    await fastDeployFixture(initOpts);
    fast = await ethers.getContract('FastBSF');
    spcMemberFast = fast.connect(spcMember);
    // Add a member.
    await fast.connect(governor).addMember(member.address);
  });

  describe('details', async () => {
    it('returns a populated details struct', async () => {
      const subject = await spcMemberFast.details();

      expect(subject.addr).to.eq(fast.address);
      expect(subject.name).to.eq("Better, Stronger, FASTer");
      expect(subject.symbol).to.eq("BSF");
      expect(subject.decimals).to.eq(18);
      expect(subject.totalSupply).to.eq(0);
      expect(subject.transferCredits).to.eq(0);
      expect(subject.isSemiPublic).to.eq(true);
      expect(subject.hasFixedSupply).to.eq(true);
      expect(subject.reserveBalance).to.eq(0);
      expect(subject.memberCount).to.eq(1);
      expect(subject.governorCount).to.eq(1);
    });
  });

  describe('detailedMember', async () => {
    it('returns MemberDetails populated struct', async () => {
      // TODO: Rework this when smock can handle it.
      //   const subject = await spcMemberFast.detailedMember(spcMember.address);
      //   const d: MemberDetails = subject;

      //   expect(d.addr).to.eq(spcMember.address);
      //   expect(d.balance).to.eq(0.0);
      //   expect(d.ethBalance).to.eq(tenThousand);
      //   expect(d.isGovernor).to.eq(false);
    });
  });

  describe('paginateDetailedMembers', async () => {
    it('returns member details with next cursor', async () => {
      const [[memberDetails], nextCursor] = await spcMemberFast.paginateDetailedMembers(0, 5);
      // Member details.
      expect(memberDetails.addr).to.eq(member.address);
      expect(memberDetails.balance).to.eq(0.0);
      expect(memberDetails.ethBalance).to.eq(tenThousand);
      expect(memberDetails.isGovernor).to.eq(false);
      // Next cursor.
      expect(nextCursor).to.eq(1);
    });
  });
});
