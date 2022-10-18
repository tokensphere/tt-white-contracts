import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, MockContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { impersonateContract } from '../utils';
import { Issuer, Marketplace, FastTopFacet, Fast, FastFrontendFacet } from '../../typechain';
import { fastFixtureFunc, FAST_INIT_DEFAULTS } from '../fixtures/fast';
chai.use(solidity);
chai.use(smock.matchers);


describe('FastTopFacet', () => {
  let
    deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress,
    bob: SignerWithAddress;
  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    fast: Fast,
    top: FastTopFacet,
    frontendMock: MockContract<FastFrontendFacet>,
    issuerMemberTop: FastTopFacet,
    topAsItself: FastTopFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, bob] = await ethers.getSigners();
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake('Issuer');
    marketplace = await smock.fake('Marketplace');
  });

  beforeEach(async () => {
    // Set up issuer mock.
    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);
    // Set up marketplace mock.
    marketplace.issuerAddress.returns(issuer.address);
    marketplace.isMember.reset();
    marketplace.isMember.whenCalledWith(governor.address).returns(true);
    marketplace.isMember.returns(false);
    marketplace.isActiveMember.reset();
    marketplace.isActiveMember.whenCalledWith(governor.address).returns(true);
    marketplace.isActiveMember.returns(false);

    await fastDeployFixture({
      opts: {
        name: 'FastTopFixture',
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ fast, frontendMock } = args);
          top = await ethers.getContractAt<FastTopFacet>('FastTopFacet', fast.address);
          issuerMemberTop = top.connect(issuerMember);
        }
      },
      initWith: {
        issuer: issuer.address,
        marketplace: marketplace.address,
        governor: governor.address
      }
    });

    topAsItself = await impersonateContract(top);

    // Set up frontend facet mock.
    frontendMock.emitDetailsChanged.reset();
  });

  // Getters.

  describe('issuerAddress', async () => {
    it('returns the Issuer address', async () => {
      const subject = await issuerMemberTop.issuerAddress();
      expect(subject).to.eq(issuer.address);
    });
  });

  describe('marketplaceAddress', async () => {
    it('returns the marketplace address', async () => {
      const subject = await issuerMemberTop.marketplaceAddress();
      expect(subject).to.eq(marketplace.address);
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
    it('requires Issuer membership for the sender', async () => {
      const subject = top.setIsSemiPublic(true);
      await expect(subject).to.be
        .revertedWith(`RequiresIssuerMembership("${deployer.address}")`);
    });

    it('delegates to the Issuer for permission check', async () => {
      issuer.isMember.reset();
      issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
      await issuerMemberTop.setIsSemiPublic(true);
      expect(issuer.isMember).to.be
        .calledOnceWith(issuerMember.address);
    });

    it('prevents changing from semi-public to closed', async () => {
      // Set as semi public.
      await issuerMemberTop.setIsSemiPublic(true);
      // Attempt to revert to non-semi public.
      const subject = issuerMemberTop.setIsSemiPublic(false);
      await expect(subject).to.be
        .revertedWith('UnsupportedOperation()');
    });

    it('sets the required flag on the FAST', async () => {
      await issuerMemberTop.setIsSemiPublic(true);
      expect(await issuerMemberTop.isSemiPublic()).to.be.true;
    });

    it('delegates to FastFrontendFacet.emitDetailsChanged', async () => {
      frontendMock.emitDetailsChanged.reset();
      await issuerMemberTop.setIsSemiPublic(true);
      expect(frontendMock.emitDetailsChanged).to.be.calledOnce;
    });
  });

  describe('setTransfersDisabled', async () => {
    it('requires Issuer membership from the sender', async () => {
      const subject = top.setTransfersDisabled(true);
      await expect(subject).to.be
        .revertedWith(`RequiresIssuerMembership("${deployer.address}")`);
    });

    it('delegates to FastFrontendFacet.emitDetailsChanged', async () => {
      await issuerMemberTop.setTransfersDisabled(true);
      expect(frontendMock.emitDetailsChanged).to.be.calledOnce;
    });

    it('sets the flag to `false` when transfers are enabled', async () => {
      await issuerMemberTop.setTransfersDisabled(false);
      const subject = await top.transfersDisabled();
      expect(subject).to.be.false;
    });

    it('sets the flag to `true` when transfers are disabled', async () => {
      await issuerMemberTop.setTransfersDisabled(true);
      const subject = await top.transfersDisabled();
      expect(subject).to.be.true;
    });
  });
});
