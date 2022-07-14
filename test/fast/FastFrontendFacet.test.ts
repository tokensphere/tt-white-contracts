import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { zero, tenThousand, abiStructToObj, oneHundred } from '../utils';
import { Spc, Exchange, FastFrontendFacet } from '../../typechain';
import { fastFixtureFunc, FAST_INIT_DEFAULTS } from '../fixtures/fast';
import { toUnpaddedHexString } from '../../src/utils';
chai.use(solidity);
chai.use(smock.matchers);


describe('FastFrontendFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    governor: SignerWithAddress,
    member: SignerWithAddress;
  let spc: FakeContract<Spc>,
    exchange: FakeContract<Exchange>,
    frontend: FastFrontendFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

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
    await fastDeployFixture({
      opts: {
        name: 'FastFrontendFixture',
        deployer: deployer.address,
        afterDeploy: async ({ fast }) => {
          frontend = await ethers.getContractAt<FastFrontendFacet>('FastFrontendFacet', fast.address);
          // Add members.
          const governedFast = fast.connect(governor);
          await governedFast.addMember(member.address);
          await governedFast.addMember(governor.address);
        }
      },
      initWith: {
        spc: spc.address,
        exchange: exchange.address,
        governor: governor.address,
      }
    });
  });

  describe('emitDetailsChanged', async () => {
    it('requires tha the caller is the diamond');
    it('emits a DetailsChanged event with all the correct information');
  });

  describe('details', async () => {
    it('returns a populated details struct', async () => {
      await ethers.provider.send("hardhat_setBalance", [frontend.address, toUnpaddedHexString(oneHundred)]);
      const subject = await frontend.details();
      const subjectObj = abiStructToObj(subject);

      expect(subjectObj).to.eql({
        addr: frontend.address,
        name: FAST_INIT_DEFAULTS.name,
        symbol: FAST_INIT_DEFAULTS.symbol,
        decimals: FAST_INIT_DEFAULTS.decimals,
        totalSupply: zero,
        transferCredits: zero,
        isSemiPublic: FAST_INIT_DEFAULTS.isSemiPublic,
        hasFixedSupply: FAST_INIT_DEFAULTS.hasFixedSupply,
        reserveBalance: zero,
        ethBalance: oneHundred,
        memberCount: BigNumber.from(2),
        governorCount: BigNumber.from(1)
      });
    });
  });

  describe('detailedMember', async () => {
    it('returns a MemberDetails struct with the correct information', async () => {
      const subject = await frontend.detailedMember(spcMember.address);
      const memberObj = abiStructToObj(subject);

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
      const [members, nextCursor] = await frontend.paginateDetailedMembers(0, 5);
      // Convert the structs to objects.
      const [memberAObj, memberBObj] = members.map(abiStructToObj);

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
      const [members, /*nextCursor*/] = await frontend.paginateDetailedMembers(1, 2);
      // Convert the structs to objects.
      const [memberAObj] = members.map(abiStructToObj);

      // Expect Member B.
      expect(memberAObj).to.eql({
        addr: governor.address,
        balance: zero,
        ethBalance: (await governor.getBalance()),
        isGovernor: true
      });
    });
  });
});
