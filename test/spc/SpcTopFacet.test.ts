import * as chai from 'chai';
import { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments, ethers } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { Fast, Spc, SpcTopFacet } from '../../typechain';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';
import { toHexString, ZERO_ADDRESS } from '../../src/utils';
import {
  DUPLICATE_ENTRY,
  MISSING_ATTACHED_ETH,
  negOneHundred, negTwo, negTwoHundredFifty, negTwoHundredForty,
  ninety, oneHundred, oneMillion, REQUIRES_SPC_MEMBERSHIP, ten, tenThousand, two, twoHundredFifty, twoHundredForty
} from '../utils';
import { spcFixtureFunc } from '../fixtures/spc';
chai.use(solidity);
chai.use(smock.matchers);


describe('SpcTopFacet', () => {
  let
    deployer: SignerWithAddress,
    spcMember: SignerWithAddress;
  let spc: Spc,
    spcMemberSpc: Spc,
    top: SpcTopFacet,
    spcMemberTop: SpcTopFacet;

  const spcDeployFixture = deployments.createFixture(spcFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcMember] = await ethers.getSigners();
  });

  beforeEach(async () => {
    await spcDeployFixture({
      opts: {
        name: 'SpcTopFixture',
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ spc } = args)
          spcMemberSpc = spc.connect(spcMember);
          top = await ethers.getContractAt<SpcTopFacet>('SpcTopFacet', spc.address);
          spcMemberTop = top.connect(spcMember);
        }
      },
      initWith: {
        member: spcMember.address
      }
    });
  });

  /// Eth provisioning stuff.

  describe('provisionWithEth', async () => {
    it('reverts when no Eth is attached', async () => {
      const subject = top.provisionWithEth();
      await expect(subject).to.be
        .revertedWith(MISSING_ATTACHED_ETH);
    });

    it('is payable and locks the attached Eth', async () => {
      const subject = async () => await top.provisionWithEth({ value: ninety });
      await expect(subject).to.have.changeEtherBalance(top, ninety);
    });
  });

  describe('drainEth', async () => {
    it('requires SPC membership', async () => {
      const subject = top.drainEth();
      await expect(subject).to.be
        .revertedWith(REQUIRES_SPC_MEMBERSHIP);
    });

    it('transfers all the locked Eth to the caller', async () => {
      // Provision the SPC account with a lot of Eth.
      await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(oneHundred)]);
      const subject = async () => await spcMemberTop.drainEth();
      await expect(subject).to
        .changeEtherBalances([spc, spcMember], [negOneHundred, oneHundred]);
    });

    it('emits a EthDrained event', async () => {
      // Provision the SPC account with 1_000_000 Eth.
      await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(oneHundred)]);
      const subject = spcMemberSpc.drainEth();
      await expect(subject).to
        .emit(spc, 'EthDrained')
        .withArgs(spcMember.address, oneHundred);
    });
  });

  /// FAST management stuff.

  describe('FAST management', async () => {
    let f01: FakeContract<Fast>,
      f02: FakeContract<Fast>,
      f03: FakeContract<Fast>;

    beforeEach(async () => {
      // Two fasts are registered with the SPC.
      f01 = await smock.fake('Fast');
      f01.symbol.returns('F01');
      await spcMemberSpc.registerFast(f01.address);
      f02 = await smock.fake('Fast');
      f02.symbol.returns('F02');
      await spcMemberSpc.registerFast(f02.address);
      // Third fast isn't registered with SPC.
      f03 = await smock.fake('Fast');
      f03.symbol.returns('F03');
    });

    describe('isFastRegistered', async () => {
      it('returns false when the FAST symbol is unknown', async () => {
        const [notAContract] = await ethers.getSigners()
        const subject = await top.isFastRegistered(notAContract.address);
        expect(subject).to.eq(false);
      });

      it('returns true when the FAST symbol is registered', async () => {
        const subject = await top.isFastRegistered(f01.address);
        expect(subject).to.eq(true);
      });
    });

    describe('fastBySymbol', async () => {
      it('returns the zero address when the FAST symbol is unknown', async () => {
        const subject = await top.fastBySymbol('UKN');
        expect(subject).to.eq(ZERO_ADDRESS);
      });

      it('returns the FAST address when the FAST symbol is registered', async () => {
        const subject = await top.fastBySymbol('F01');
        expect(subject).to.eq(f01.address);
      });
    });

    describe('registerFast', async () => {
      it('requires SPC membership', async () => {
        const subject = top.registerFast(f01.address);
        await expect(subject).to.have
          .revertedWith(REQUIRES_SPC_MEMBERSHIP);
      });

      it('forbids adding two FASTS with the same symbol', async () => {
        const duplFast = await smock.fake('Fast');
        duplFast.symbol.returns('F01');
        const subject = spcMemberSpc.registerFast(duplFast.address)
        await expect(subject).to.be
          .revertedWith(DUPLICATE_ENTRY);
      });

      it('adds the registry address to the list of registries', async () => {
        // Note that this test is already covered by tests for `fastBySymbol`.
        // It would add very little value to add anything to it.
      });

      it('keeps track of the symbol', async () => {
        // Note that this test is already covered by tests for `fastBySymbol`.
        // It would add very little value to add anything to it.
      });

      it('provisions the FAST with 250 Eth', async () => {
        await ethers.provider.send("hardhat_setBalance", [f03.address, '0x0']);
        // Do it!
        const subject = async () => await spcMemberSpc.registerFast(f03.address);
        // Check balances.
        await expect(subject).to.changeEtherBalances([spc, f03], [negTwoHundredFifty, twoHundredFifty]);
      });

      it('only tops-up the FAST if it already has Eth', async () => {
        await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(tenThousand)]);
        await ethers.provider.send("hardhat_setBalance", [f03.address, toHexString(ten)]);
        // Do it!
        const subject = async () => await spcMemberSpc.registerFast(f03.address);
        // Check balances.
        await expect(subject).to.changeEtherBalances([spc, f03], [negTwoHundredForty, twoHundredForty]);
      });

      it('only provisions the FAST up to the available balance', async () => {
        await ethers.provider.send("hardhat_setBalance", [spc.address, toHexString(two)]);
        await ethers.provider.send("hardhat_setBalance", [f03.address, '0x0']);
        // Do it!
        const subject = async () => await spcMemberSpc.registerFast(f03.address);
        // Check balances.
        await expect(subject).to.changeEtherBalances([spc, f03], [negTwo, two]);
      });

      it('emits a FastRegistered event', async () => {
        const subject = spcMemberSpc.registerFast(f03.address);
        await expect(subject).to
          .emit(spc, 'FastRegistered')
          .withArgs(f03.address);
      });
    });

    describe('fastCount', async () => {
      it('returns the FAST count', async () => {
        const subject = await spc.fastCount();
        expect(subject).to.eq(2);
      });
    });

    describe('paginateFasts', async () => {
      it('returns pages of FASTs', async () => {
        // We're testing the pagination library here... Not too good. But hey, we're in a rush.
        const [[a1, a2],/*nextCursor*/] = await spc.paginateFasts(0, 10);
        expect(a1).to.eq(f01.address);
        expect(a2).to.eq(f02.address);
      });
    });
  });
});
