import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { Issuer, Fast, MarketplaceTokenHoldersFacet, Marketplace } from '../../typechain';
import { marketplaceFixtureFunc } from '../fixtures/marketplace';
import { ten, zero, impersonateContract } from '../utils';
import { ZERO_ADDRESS } from '../../src/utils';
chai.use(solidity);
chai.use(smock.matchers);


describe('MarketplaceTokenHoldersFacet', () => {
  let deployer: SignerWithAddress,
    alice: SignerWithAddress;
  let issuer: FakeContract<Issuer>,
    fast: FakeContract<Fast>,
    marketplace: Marketplace,
    tokenHolders: MarketplaceTokenHoldersFacet,
    tokenHoldersAsFast: MarketplaceTokenHoldersFacet;

  const marketplaceDeployFixture = deployments.createFixture(marketplaceFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, /* issuerMember */, alice] = await ethers.getSigners();
    // Mock an Issuer and FAST contract.
    issuer = await smock.fake('Issuer');
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
        issuer: issuer.address
      }
    });

    // Impersonate the FAST.
    tokenHoldersAsFast = await impersonateContract(tokenHolders, fast.address);

    // Add a balance on Alice's account and the zero address.
    fast.balanceOf.reset();
    fast.balanceOf.whenCalledWith(alice.address).returns(ten);
    fast.balanceOf.whenCalledWith(ZERO_ADDRESS).returns(ten);
    fast.balanceOf.returns(zero);

    // The FAST is registered.
    issuer.isFastRegistered.reset();
    issuer.isFastRegistered.whenCalledWith(fast.address).returns(true);
    issuer.isFastRegistered.returns(false);
  });

  describe('holdingsUpdated', async () => {
    it('reverts if not called by a FAST contract', async () => {
      // Trigger the holding update callback.
      const subject = tokenHolders.fastBalanceChanged(alice.address, 0);

      await expect(subject).to.have
        .revertedWith('RequiresFastContractCaller');
    });

    it('returns a list of FASTs that an account holds', async () => {
      // Trigger the holding update callback.
      await tokenHoldersAsFast.fastBalanceChanged(alice.address, 10);

      // Expects that the FAST has been added to the list.
      const subject = await tokenHolders.holdings(alice.address);
      expect(subject).to.be.eql([fast.address]);
    });

    it('removes the FAST holding if account balance drops to 0', async () => {
      // Trigger the holding update callback.
      await tokenHoldersAsFast.fastBalanceChanged(alice.address, 10);
      // Trigger the callback again.
      await tokenHoldersAsFast.fastBalanceChanged(alice.address, 0);
      // Expects that the FAST has been removed from the list.
      const subject = await tokenHolders.holdings(alice.address);
      expect(subject).to.be.empty;
    });

    it('does not track the zero address', async () => {
      // Trigger the callback.
      await tokenHoldersAsFast.fastBalanceChanged(ZERO_ADDRESS, fast.address);

      // Expects that the ZERO address doesn't have an entry.
      const subject = await tokenHolders.holdings(ZERO_ADDRESS);
      expect(subject).to.be.eql([]);
    });
  });

  describe('holdings', async () => {
    it('returns a list of FASTs a account holds', async () => {
      // Trigger the holding update callback.
      await tokenHoldersAsFast.fastBalanceChanged(alice.address, fast.address);

      // Expects that the FAST has been removed from the list.
      const subject = await tokenHolders.holdings(alice.address);
      expect(subject).to.be.eql([fast.address]);
    });
  });
});
