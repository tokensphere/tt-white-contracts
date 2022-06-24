import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { tenThousand } from '../utils';
import { DEPLOYER_FACTORY_COMMON } from '../../src/utils';
import { Spc, Exchange, FastFrontendFacet } from '../../typechain';
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

// Interfaces for returned structs.

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

interface MemberDetails {
  addr: string;
  balance: BigNumber;
  ethBalance: BigNumber;
  isGovernor: boolean;
}

const FAST_FACETS = ['FastFrontendFacet'];

const fastDeployFixture = deployments.createFixture(async (hre, uOpts) => {
  const initOpts = uOpts as FastFixtureOpts;
  const { deployer, ...initFacetArgs } = initOpts;
  // Deploy the diamond.
  return await deployments.diamond.deploy('FastFrontendFacet', {
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
    governor: SignerWithAddress;
  let spc: FakeContract<Spc>,
    exchange: FakeContract<Exchange>,
    token: FastFrontendFacet,
    spcMemberToken: FastFrontendFacet;

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, governor] = await ethers.getSigners();
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
    const fast = await ethers.getContractAt('Fast', deploy.address) as FastFrontendFacet;

    // TODO: Once smock fixes their stuff, replace facets by fakes.
    token = fast as FastFrontendFacet;
    spcMemberToken = token.connect(spcMember);
  });

  describe('details', async () => {
    it('returns a populated Details struct', async () => {
      const subject = await spcMemberToken.details();
      const d: Details = subject;

      expect(d.addr).to.eq(token.address);
      expect(d.name).to.eq("Better, Stronger, FASTer");
      expect(d.symbol).to.eq("BSF");
      expect(d.decimals).to.eq(18);
      expect(d.totalSupply).to.eq(0);
      expect(d.transferCredits).to.eq(0);
      expect(d.isSemiPublic).to.eq(true);
      expect(d.hasFixedSupply).to.eq(true);
      expect(d.reserveBalance).to.eq(0);
      expect(d.memberCount).to.eq(1);
      expect(d.governorCount).to.eq(1);
    });
  });

  describe('detailedMember', async () => {
    it('returns MemberDetails populated struct', async () => {
      // TODO: Rework this when smock can handle it.
      //   const subject = await spcMemberToken.detailedMember(spcMember.address);
      //   const d: MemberDetails = subject;

      //   expect(d.addr).to.eq(spcMember.address);
      //   expect(d.balance).to.eq(0.0);
      //   expect(d.ethBalance).to.eq(tenThousand);
      //   expect(d.isGovernor).to.eq(false);
    });
  });

  describe('paginateDetailedMembers', async () => {
    it('returns MemberDetails array with next cursor', async () => {
      const index = 0;
      const perPage = 5;
      const subject = await spcMemberToken.paginateDetailedMembers(index, perPage);
      const [[memberDetails], page] = subject

      // Member details.
      expect(memberDetails.addr).to.eq(governor.address);
      expect(memberDetails.balance).to.eq(0.0);
      expect(memberDetails.ethBalance).to.eq(tenThousand);
      expect(memberDetails.isGovernor).to.eq(true);

      // Page 1.
      expect(page).to.eq(1);
    });
  });
});
