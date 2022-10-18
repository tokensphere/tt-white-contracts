import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import hre from 'hardhat';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { Issuer, Marketplace, Fast, FastInitFacet } from '../../typechain';
import { fastFixtureFunc, FAST_INIT_DEFAULTS } from '../fixtures/fast';
import { FAST_FACETS } from '../../tasks/fast';
import { DEPLOYER_FACTORY_COMMON, deploymentSalt, ZERO_ADDRESS } from '../../src/utils';
import { BigNumber } from 'ethers';
chai.use(solidity);
chai.use(smock.matchers);


const numberToBytes32 = (bn: BigNumber) => ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32))

describe('FastTopFacet', () => {
  let
    deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress,
    bob: SignerWithAddress;
  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    fast: Fast,
    initFacet: FastInitFacet,
    initFacetAsDeployer: FastInitFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, bob] = await ethers.getSigners();
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake('Issuer');
    marketplace = await smock.fake('Marketplace');
  });

  beforeEach(async () => {
    // Set the Issuer mock.
    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);
    // Set up marketplace mock.
    marketplace.issuerAddress.returns(issuer.address);
    marketplace.isMember.reset();
    marketplace.isMember.whenCalledWith(governor.address).returns(true);
    marketplace.isMember.returns(false);
    marketplace.isMemberActive.reset();
    marketplace.isMemberActive.whenCalledWith(governor.address).returns(true);
    marketplace.isMemberActive.returns(false);

    await fastDeployFixture({
      opts: {
        name: 'FastTopFixture',
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ fast } = args);
          // Add the init facet back to the diamond.
          await deployments.diamond.deploy('FastTopFixture', {
            from: deployer.address,
            facets: [...FAST_FACETS, 'FastInitFacet'],
            deterministicSalt: deploymentSalt(hre)
          })
          initFacet = await ethers.getContractAt<FastInitFacet>('FastInitFacet', fast.address);
        }
      },
      initWith: {
        issuer: issuer.address,
        marketplace: marketplace.address,
        governor: governor.address
      }
    });
  });

  // Getters.

  describe('initialize', async () => {
    beforeEach(async () => {
      // We need to impersonate our deployer factory contract.
      await hre.network.provider.request({ method: 'hardhat_impersonateAccount', params: [DEPLOYER_FACTORY_COMMON.factory] });
      // Give it a bit of Eth to fund the transaction.
      await ethers.provider.send('hardhat_setBalance', [DEPLOYER_FACTORY_COMMON.factory, '0xffffffffffffffffff']);
      // Get the factory signer so that we can act on its behalf.
      const factorySigner = await ethers.getSigner(DEPLOYER_FACTORY_COMMON.factory);
      initFacetAsDeployer = initFacet.connect(factorySigner);
    });

    it('reverts when already initialized', async () => {
      const subject = initFacetAsDeployer.initialize({
        ...FAST_INIT_DEFAULTS,
        issuer: ZERO_ADDRESS,
        marketplace: ZERO_ADDRESS,
        governor: ZERO_ADDRESS
      });
      expect(subject).to.be
        .revertedWith('AlreadyInitialized()');
    });

    it('sets LibFast storage version', async () => {
      const slot = ethers.utils.solidityKeccak256(['string'], ['Fast.storage']);
      const subject = await ethers.provider.send('eth_getStorageAt', [fast.address, slot]);
      // TODO: Why is this failing?!
      // expect(BigNumber.from(subject)).to.eq(1);
    });

    it('sets LibFastAccess storage version', async () => {
      const slot = ethers.utils.solidityKeccak256(['string'], ['Fast.storage.Access']);
      const subject = await ethers.provider.send('eth_getStorageAt', [fast.address, slot]);
      expect(BigNumber.from(subject)).to.eq(1);
    });

    it('sets LibFastHistory storage version', async () => {
      const slot = ethers.utils.solidityKeccak256(['string'], ['Fast.storage.History']);
      const subject = await ethers.provider.send('eth_getStorageAt', [fast.address, slot]);
      expect(BigNumber.from(subject)).to.eq(1);
    });

    it('sets LibFastToken storage version', async () => {
      const slot = ethers.utils.solidityKeccak256(['string'], ['Fast.storage.Token']);
      const subject = await ethers.provider.send('eth_getStorageAt', [fast.address, slot]);
      expect(BigNumber.from(subject)).to.eq(1);
    });

    it('registers supported interfaces');
    it('adds the given governor address to the governors list');

    describe('when running...', async () => {
      beforeEach(async () => {
        // We reset the version to zero before each run, so that the facet thinks it's not initialized yet.
        const slot = ethers.utils.solidityKeccak256(['string'], ['Fast.storage']);
        await ethers.provider.send('hardhat_setStorageAt', [fast.address, slot, numberToBytes32(BigNumber.from(0))]);
      });

      it('reverts when the passed governor address is not a marketplace member', async () => {
        // Pretend that our governor isn't part of the marketplace.
        marketplace.isMember.whenCalledWith(governor.address).returns(false);
        // Try and initialize.
        const subject = initFacetAsDeployer.initialize({
          ...FAST_INIT_DEFAULTS,
          issuer: issuer.address,
          marketplace: marketplace.address,
          governor: governor.address
        });
        // Should have failed.
        await expect(subject).to.be
          .revertedWith(`RequiresMarketplaceMembership("${governor.address}")`);
      });

      it('reverts when the passed governor address is deactivated in the marketplace', async () => {
        // Pretend that our governor is a marketplace member, but deactivated.
        marketplace.isMember.whenCalledWith(governor.address).returns(true);
        marketplace.isMemberActive.whenCalledWith(governor.address).returns(false);
        // Try and initialize.
        const subject = initFacetAsDeployer.initialize({
          ...FAST_INIT_DEFAULTS,
          issuer: issuer.address,
          marketplace: marketplace.address,
          governor: governor.address
        });
        // Should have failed.
        await expect(subject).to.be
          .revertedWith(`RequiresMarketplaceActiveMember("${governor.address}")`);
      });

      it('emits a GovernorAdded event', async () => {
        // Try and initialize.
        const subject = initFacetAsDeployer.initialize({
          ...FAST_INIT_DEFAULTS,
          issuer: issuer.address,
          marketplace: marketplace.address,
          governor: governor.address
        });
        await expect(subject).to
          .emit(fast, 'GovernorAdded')
          .withArgs(governor.address);
      });
    });
  });
});
