import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { Issuer, Fast, MarketplaceAutomatonsFacet, Marketplace } from '../../typechain';
import { impersonateContract } from '../utils';
import { marketplaceFixtureFunc } from '../fixtures/marketplace';
chai.use(solidity);
chai.use(smock.matchers);

describe('MarketplaceAutomatonsFacet', () => {
  let
    deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    rob: SignerWithAddress,
    john: SignerWithAddress;

  let issuer: FakeContract<Issuer>,
    fast: FakeContract<Fast>,
    marketplace: Marketplace,
    marketplaceAsItself: Marketplace,
    automatons: MarketplaceAutomatonsFacet;

  const marketplaceDeployFixture = deployments.createFixture(marketplaceFixtureFunc);

  const resetIssuerMock = () => {
    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);
  }

  const resetFastMock = () => {
    issuer.isFastRegistered.reset();
    issuer.isFastRegistered.whenCalledWith(fast.address).returns(true);
    issuer.isFastRegistered.returns(false);
  }

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, alice, bob, rob, john] = await ethers.getSigners();
    // Mock Issuer and Fast contracts.
    issuer = await smock.fake('Issuer');
    fast = await smock.fake('Fast');
  });

  beforeEach(async () => {
    await marketplaceDeployFixture({
      opts: {
        name: 'MarketplaceAutomatonsFixture',
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ marketplace } = args);
          automatons = await ethers.getContractAt<MarketplaceAutomatonsFacet>('MarketplaceAutomatonsFacet', marketplace.address);
        }
      },
      initWith: {
        issuer: issuer.address
      }
    });

    marketplaceAsItself = await impersonateContract(marketplace);

    resetIssuerMock();
    resetFastMock()
  });
  describe('IHasAutomatons', async () => {
    describe('isAutomaton', async () => {
      it('returns true when a privilege exists for the given candidate');
      it('returns false when no privilege exists for the given candidate');
    });

    describe('automatonPrivileges', async () => {
      it('returns a bitfield of the candidate privileges');
    });

    describe('automatonCount', async () => {
      it('returns the number of registered automatons');
    });

    describe('paginateAutomatons', async () => {
      it('paginates registered automatons');
    });

    describe('automatonPrivilegesStruct', async () => {
      it('returns candidate privileges in the form of a struct');
    });

    describe('setAutomatonPrivileges', async () => {
      it('assigns the given privileges to the candidate');
      it('overwrites existing privileges');
    });

    describe('removeAutomaton', async () => {
      it('removes the automaton from the list');
    });
  });
});
