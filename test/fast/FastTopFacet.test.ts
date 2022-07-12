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
  impersonateDiamond
} from '../utils';
import { toHexString, ZERO_ADDRESS } from '../../src/utils';
import { Spc, Exchange, FastTopFacet, Fast } from '../../typechain';
import { fastFixtureFunc } from './utils';
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
    token: FastTopFacet,
    spcMemberToken: FastTopFacet;

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
          token = await ethers.getContractAt<FastTopFacet>('FastTopFacet', fast.address);
          spcMemberToken = token.connect(spcMember);
        }
      },
      initWith: {
        spc: spc.address,
        exchange: exchange.address,
        governor: governor.address
      }
    });

    // Set the SPC member.
    spc.isMember.reset();
    spc.isMember.whenCalledWith(spcMember.address).returns(true);
    spc.isMember.returns(false);
  });

  // Getters.

  describe('spcAddress', async () => {
    it('returns the SPC address', async () => {
      const subject = await spcMemberToken.spcAddress();
      expect(subject).to.eq(spc.address);
    });
  });

  describe('exchangeAddress', async () => {
    it('returns the exchange address', async () => {
      const subject = await spcMemberToken.exchangeAddress();
      expect(subject).to.eq(exchange.address);
    });
  });

  describe('hasFixedSupply', async () => {
    it('returns the token fixed supply parameter', async () => {
      const subject = await token.hasFixedSupply();
      expect(subject).to.eq(true);
    });
  });

  // Setters.

  describe('setIsSemiPublic', async () => {
    it('requires SPC membership for the sender', async () => {
      const subject = token.setIsSemiPublic(true);
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('cannot revert an SPC to non-semi public once set', async () => {
      // Set as semi public.
      await spcMemberToken.setIsSemiPublic(true);
      // Attempt to revert to non-semi public.
      const subject = spcMemberToken.setIsSemiPublic(false);
      await expect(subject).to.be
        .revertedWith(UNSUPPORTED_OPERATION);
    });

    it('sets the required isSemiPublic flag on the token', async () => {
      await spcMemberToken.setIsSemiPublic(true);
      expect(await spcMemberToken.isSemiPublic()).to.be.true;
    });
  });

  // Provisioning functions.

  describe('provisionWithEth', async () => {
    it('reverts when no Eth is attached', async () => {
      const subject = spcMemberToken.provisionWithEth();
      await expect(subject).to.be
        .revertedWith(MISSING_ATTACHED_ETH);
    });

    it('emits a EthReceived event', async () => {
      const subject = spcMemberToken.provisionWithEth({ value: ninety });
      await expect(subject).to
        .emit(fast, 'EthReceived')
        .withArgs(spcMember.address, ninety)
    });
  });

  describe('drainEth', async () => {
    it('requires SPC membership', async () => {
      const subject = token.drainEth();
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('transfers all the locked Eth to the caller', async () => {
      // Provision the FAST with a lot of Eth.
      await ethers.provider.send("hardhat_setBalance", [token.address, toHexString(oneHundred)]);
      // Drain the FAST.
      const subject = async () => await spcMemberToken.drainEth();
      await expect(subject).to.changeEtherBalances([token, spcMember], [negOneHundred, oneHundred]);
    });

    it('emits a EthDrained event', async () => {
      // Provision the FAST with a lot of Eth.
      await ethers.provider.send("hardhat_setBalance", [token.address, toHexString(oneHundred)]);
      // Drain the FAST.
      const subject = spcMemberToken.drainEth();
      await expect(subject).to
        .emit(fast, 'EthDrained')
        .withArgs(spcMember.address, oneHundred);
    });
  });

  describe('payUpTo', async () => {
    it('cannot be called directly', async () => {
      await expect(spcMemberToken.payUpTo(bob.address, ninety)).to.be
        .revertedWith(INTERNAL_METHOD);
    });

    describe('as diamondInternal', async () => {
      let tokenAsItself: FastTopFacet;

      beforeEach(async () => {
        // Impersonate the diamond.
        tokenAsItself = await impersonateDiamond(token);
      });

      afterEach(async () => {
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [token.address]);
      });

      it('requires the recipient to be non-zero address', async () => {
        const subject = tokenAsItself.payUpTo(ZERO_ADDRESS, ninety);
        await expect(subject).to.be
          .revertedWith(REQUIRES_NON_ZERO_ADDRESS);
      });
    });
  });
});
