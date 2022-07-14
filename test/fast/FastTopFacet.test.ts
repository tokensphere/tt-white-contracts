import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import {
  negOneHundred,
  oneHundred,
  ninety,
  REQUIRES_SPC_MEMBERSHIP,
  REQUIRES_NON_ZERO_ADDRESS,
  UNSUPPORTED_OPERATION,
  MISSING_ATTACHED_ETH,
  INTERNAL_METHOD,
  impersonateContract
} from '../utils';
import { toUnpaddedHexString, ZERO_ADDRESS } from '../../src/utils';
import { Spc, Exchange, FastTopFacet, Fast } from '../../typechain';
import { fastFixtureFunc, FAST_INIT_DEFAULTS } from '../fixtures/fast';
chai.use(solidity);
chai.use(smock.matchers);


describe('FastTopFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress,
    governor: SignerWithAddress,
    bob: SignerWithAddress;
  let spc: FakeContract<Spc>,
    exchange: FakeContract<Exchange>,
    fast: Fast,
    top: FastTopFacet,
    spcMemberTop: FastTopFacet,
    topAsItself: FastTopFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember, governor, bob] = await ethers.getSigners();
    // Mock an SPC and an Exchange contract.
    spc = await smock.fake('Spc');
    exchange = await smock.fake('Exchange');
    exchange.spcAddress.returns(spc.address);
  });

  beforeEach(async () => {
    await fastDeployFixture({
      opts: {
        name: 'FastTopFixture',
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ fast } = args);
          top = await ethers.getContractAt<FastTopFacet>('FastTopFacet', fast.address);
          spcMemberTop = top.connect(spcMember);
        }
      },
      initWith: {
        spc: spc.address,
        exchange: exchange.address,
        governor: governor.address
      }
    });

    topAsItself = await impersonateContract(top)

    // Set the SPC member.
    spc.isMember.reset();
    spc.isMember.whenCalledWith(spcMember.address).returns(true);
    spc.isMember.returns(false);
  });

  afterEach(async () => {
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [top.address]);
  });

  // Getters.

  describe('spcAddress', async () => {
    it('returns the SPC address', async () => {
      const subject = await spcMemberTop.spcAddress();
      expect(subject).to.eq(spc.address);
    });
  });

  describe('exchangeAddress', async () => {
    it('returns the exchange address', async () => {
      const subject = await spcMemberTop.exchangeAddress();
      expect(subject).to.eq(exchange.address);
    });
  });

  describe('isSemiPublic', async () => {
    it('returns the FAST semi-public parameter', async () => {
      const subject = await top.isSemiPublic();
      expect(subject).to.eq(FAST_INIT_DEFAULTS.isSemiPublic);
    });
  });

  describe('hasFixedSupply', async () => {
    it('returns the FAST fixed supply parameter', async () => {
      const subject = await top.hasFixedSupply();
      expect(subject).to.eq(FAST_INIT_DEFAULTS.hasFixedSupply);
    });
  });

  // Setters.

  describe('setIsSemiPublic', async () => {
    it('requires SPC membership for the sender', async () => {
      const subject = top.setIsSemiPublic(true);
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('delegates to the SPC for permission check');

    it('cannot revert an SPC to non-semi public once set', async () => {
      // Set as semi public.
      await spcMemberTop.setIsSemiPublic(true);
      // Attempt to revert to non-semi public.
      const subject = spcMemberTop.setIsSemiPublic(false);
      await expect(subject).to.be
        .revertedWith(UNSUPPORTED_OPERATION);
    });

    it('sets the required flag on the FAST', async () => {
      await spcMemberTop.setIsSemiPublic(true);
      expect(await spcMemberTop.isSemiPublic()).to.be.true;
    });

    it('delegates to FastFrontendFacet.emitDetailsChanged');
  });

  // Provisioning functions.

  describe('provisionWithEth', async () => {
    it('reverts when no Eth is attached', async () => {
      const subject = spcMemberTop.provisionWithEth();
      await expect(subject).to.be
        .revertedWith(MISSING_ATTACHED_ETH);
    });

    it('emits a EthReceived event', async () => {
      const subject = await spcMemberTop.provisionWithEth({ value: ninety });
      await expect(subject).to
        .emit(fast, 'EthReceived')
        .withArgs(spcMember.address, ninety)
    });

    it('delegates to FastFrontendFacet.emitDetailsChanged');
  });

  describe('drainEth', async () => {
    it('requires SPC membership', async () => {
      const subject = top.drainEth();
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('delegates to the SPC for permission check');

    it('requires that the caller is not a contract');

    it('transfers all the locked Eth to the caller', async () => {
      // Provision the FAST with a lot of Eth.
      await ethers.provider.send("hardhat_setBalance", [top.address, toUnpaddedHexString(oneHundred)]);
      // Drain the FAST.
      const subject = async () => await spcMemberTop.drainEth();
      await expect(subject).to.changeEtherBalances([top, spcMember], [negOneHundred, oneHundred]);
    });

    it('emits a EthDrained event', async () => {
      // Provision the FAST with a lot of Eth.
      await ethers.provider.send("hardhat_setBalance", [top.address, toUnpaddedHexString(oneHundred)]);
      // Drain the FAST.
      const subject = await spcMemberTop.drainEth();
      await expect(subject).to
        .emit(fast, 'EthDrained')
        .withArgs(spcMember.address, oneHundred);
    });

    it('delegates to FastFrontendFacet.emitDetailsChanged');
  });

  describe('payUpTo', async () => {
    it('cannot be called directly', async () => {
      await expect(spcMemberTop.payUpTo(bob.address, ninety)).to.be
        .revertedWith(INTERNAL_METHOD);
    });

    it('requires that the caller is not a contract');

    it('requires the recipient to be non-zero address', async () => {
      const subject = topAsItself.payUpTo(ZERO_ADDRESS, ninety);
      await expect(subject).to.be
        .revertedWith(REQUIRES_NON_ZERO_ADDRESS);
    });
  });
});
