import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { zero, tenThousand } from '../utils';
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

// A way, not the best way, to get a POJO from a struct.
const structToObj = (struct: {}) => {
  let
    entries = Object.entries(struct),
    start = entries.length / 2;
  return Object.fromEntries(entries.slice(start));
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
    // Stub isMember, spcAddress calls.
    spc.isMember.whenCalledWith(spcMember.address).returns(true);
    spc.isMember.returns(false);
    exchange.spcAddress.returns(spc.address);
    exchange.isMember.whenCalledWith(member.address).returns(true);
    exchange.isMember.whenCalledWith(governor.address).returns(true);
    exchange.isMember.returns(false);
  });

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
    // Add members.
    await fast.connect(governor).addMember(member.address);
    await fast.connect(governor).addMember(governor.address);
  });

  describe('details', async () => {
    it('returns a populated details struct', async () => {
      const subject = await spcMemberFast.details();
      const subjectObj = structToObj(subject);

      expect(subjectObj).to.eql({
        addr: fast.address,
        decimals: BigNumber.from(18),
        governorCount: BigNumber.from(1),
        name: "Better, Stronger, FASTer",
        symbol: "BSF",
        totalSupply: zero,
        transferCredits: zero,
        isSemiPublic: true,
        memberCount: BigNumber.from(2),
        hasFixedSupply: true,
        reserveBalance: zero,
      });
    });
  });

  describe('detailedMember', async () => {
    it('returns MemberDetails populated struct', async () => {
      const subject = await spcMemberFast.detailedMember(spcMember.address);
      const memberObj = structToObj(subject);

      expect(memberObj).to.eql({
        addr: spcMember.address,
        balance: zero,
        ethBalance: (await spcMember.getBalance()),
        isGovernor: false
      });
    });
  });

  describe('paginateDetailedMembers', async () => {
    it('returns member details with next cursor', async () => {
      const [[
        memberA,
        memberB
      ], nextCursor] = await spcMemberFast.paginateDetailedMembers(0, 5);

      // Convert the structs to objects.
      const memberAObj = structToObj(memberA);
      const memberBObj = structToObj(memberB);

      // Member A details.
      expect(memberAObj).to.eql({
        addr: member.address,
        balance: zero,
        ethBalance: tenThousand,
        isGovernor: false
      });

      // Member B details.
      expect(memberBObj).to.eql({
        addr: governor.address,
        balance: zero,
        ethBalance: (await governor.getBalance()),
        isGovernor: true
      });

      // Next cursor.
      expect(nextCursor).to.eq(2);
    });

    it('handles an offset index cursor', async () => {
      // Fetch details of Member passing 1 as an offset index.
      const [[memberB],] = await spcMemberFast.paginateDetailedMembers(1, 2);
      const memberBObj = structToObj(memberB);

      // Expect Member B.
      expect(memberBObj).to.eql({
        addr: governor.address,
        balance: zero,
        ethBalance: (await governor.getBalance()),
        isGovernor: true
      });
    });
  });
});
