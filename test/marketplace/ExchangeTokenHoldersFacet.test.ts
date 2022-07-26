import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { Issuer, Fast, MarketplaceTokenHoldersFacet, Marketplace } from '../../typechain';
import { marketplaceFixtureFunc } from '../fixtures/marketplace';
import { REQUIRES_FAST_CONTRACT_CALLER, ten, zero, impersonateContract } from '../utils';
chai.use(solidity);
chai.use(smock.matchers);


describe('MarketplaceTokenHoldersFacet', () => {
  let deployer: SignerWithAddress,
    alice: SignerWithAddress;
  let spc: FakeContract<Spc>,
    fast: FakeContract<Fast>,
    marketplace: Marketplace,
    tokenHolders: MarketplaceTokenHoldersFacet,
    tokenHoldersAsFast: MarketplaceTokenHoldersFacet;

  const marketplaceDeployFixture = deployments.createFixture(marketplaceFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, /* spcMember */, alice] = await ethers.getSigners();
    // Mock an SPC and FAST contract.
    spc = await smock.fake('Spc');
    fast = await smock.fake('Fast');
  });

  beforeEach(async () => {
    await marketplaceDeployFixture({
      opts: {
        name: 'MarketplaceTokenHoldersFixture',
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ marketplace } = args);
          tokenHolders = await ethers.getContractAt<MarketplaceTokenHoldersFacet>('MarketplaceTokenHoldersFacet', marketplace.address);
        }
      },
      initWith: {
        spc: spc.address
      }
    });

    // Impersonate the FAST.
    tokenHoldersAsFast = await impersonateContract(tokenHolders, fast.address);

    // Add a balance on Alice's account.
    fast.balanceOf.reset();
    fast.balanceOf.whenCalledWith(alice.address).returns(ten);
    fast.balanceOf.returns(zero);

    // The FAST is registered.
    spc.isFastRegistered.reset();
    spc.isFastRegistered.whenCalledWith(fast.address).returns(true);
    spc.isFastRegistered.returns(false);
  });

  afterEach(async () => {
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [fast.address]);
  });

  describe('holdingsUpdated', async () => {
    it('reverts if not called by a FAST contract', async () => {
      // Trigger the holding update callback.
      const subject = tokenHolders.holdingUpdated(alice.address, fast.address);

      await expect(subject).to.have
        .revertedWith(REQUIRES_FAST_CONTRACT_CALLER);
    });

    it('returns a list of FASTs that an account holds', async () => {
      // Trigger the holding update callback.
      await tokenHoldersAsFast.holdingUpdated(alice.address, fast.address);

      // Expects that the FAST has been added to the list.
      const subject = await tokenHolders.holdings(alice.address);
      expect(subject).to.be.eql([fast.address]);
    });

    it('removes the FAST holding if account balance drops to 0', async () => {
      // Trigger the holding update callback.
      await tokenHoldersAsFast.holdingUpdated(alice.address, fast.address);

      // Reset account tokenHolders to zero.
      fast.balanceOf.reset();
      fast.balanceOf.returns(zero);

      // Trigger the callback again.
      await tokenHoldersAsFast.holdingUpdated(alice.address, fast.address);

      // Expects that the FAST has been removed from the list.
      const subject = await tokenHolders.holdings(alice.address);
      expect(subject).to.be.empty;
    });
  });

  describe('holdings', async () => {
    it('returns a list of FASTs a account holds', async () => {
      // Trigger the holding update callback.
      await tokenHoldersAsFast.holdingUpdated(alice.address, fast.address);

      // Expects that the FAST has been removed from the list.
      const subject = await tokenHolders.holdings(alice.address);
      expect(subject).to.be.eql([fast.address]);
    });
  });
});
