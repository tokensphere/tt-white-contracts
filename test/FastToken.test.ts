import * as chai from 'chai';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { Spc, FastRegistry, FastAccess__factory, FastAccess, FastToken, FastToken__factory, FastHistory } from '../typechain-types';
chai.use(smock.matchers);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ERC20_TOKEN_NAME = 'Random FAST Token';
const ERC20_TOKEN_SYMBOL = 'RFT';
const ERC20_TOKEN_DECIMALS = 18;

describe('FastAccess', () => {
  let
    deployer: SignerWithAddress,
    spcGovernor: SignerWithAddress,
    governor: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    rob: SignerWithAddress,
    john: SignerWithAddress;
  let reg: FastRegistry;
  let tokenFactory: FastToken__factory;
  let access: FastAccess;
  let history: FastHistory;
  let token: FastToken,
    governedToken: FastToken,
    spcGovernedToken: FastToken;

  before(async () => {
    // Keep track of a few signers.
    [deployer, spcGovernor, governor, alice, bob, rob, john] = await ethers.getSigners();
    // Deploy the libraries.
    const addressSetLib = await (await ethers.getContractFactory('AddressSetLib')).deploy();
    const paginationLib = await (await ethers.getContractFactory('PaginationLib')).deploy();
    // Deploy an SPC.
    const spcLibs = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address };
    const spcFactory = await ethers.getContractFactory('Spc', { libraries: spcLibs });
    const spc = await upgrades.deployProxy(spcFactory, [spcGovernor.address]) as Spc;

    // Create our Registry.
    const regFactory = await ethers.getContractFactory('FastRegistry');
    reg = await upgrades.deployProxy(regFactory, [spc.address]) as FastRegistry;

    // Create our access factory and contract.
    const accessLibs = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address };
    const accessFactory = await ethers.getContractFactory('FastAccess', { libraries: accessLibs });
    access = await upgrades.deployProxy(accessFactory, [reg.address, governor.address]) as FastAccess;
    // Link the access contract with the registry.
    await reg.connect(spcGovernor).setAccessAddress(access.address);

    // Create our history factory and contract.
    const historyLibs = { PaginationLib: paginationLib.address };
    const historyFactory = await ethers.getContractFactory('FastHistory', { libraries: historyLibs });
    history = await upgrades.deployProxy(historyFactory, [reg.address]) as FastHistory;
    // Register the history contract with the registry.
    await reg.connect(spcGovernor).setHistoryAddress(history.address);

    // Finally, create our token factory.
    const tokenLibs = { PaginationLib: paginationLib.address };
    tokenFactory = await ethers.getContractFactory('FastToken');
  });

  beforeEach(async () => {
    token = await upgrades.deployProxy(
      tokenFactory,
      [reg.address, ERC20_TOKEN_NAME, ERC20_TOKEN_SYMBOL, ERC20_TOKEN_DECIMALS, true]
    ) as FastToken;
    governedToken = await token.connect(governor);
    spcGovernedToken = await token.connect(spcGovernor);
    await reg.connect(spcGovernor).setTokenAddress(token.address);
  });

  /// Public stuff.

  describe('initializer', async () => {
    it('keeps track of the Registry address', async () => {
      const subject = await token.reg();
      expect(subject).to.eq(reg.address);
    });

    it('keeps track of the ERC20 parameters and extra ones', async () => {
      const name = await token.name();
      expect(name).to.eq(ERC20_TOKEN_NAME);

      const symbol = await token.symbol();
      expect(symbol).to.eq(ERC20_TOKEN_SYMBOL);

      const decimals = await token.decimals();
      expect(decimals).to.eq(ERC20_TOKEN_DECIMALS);

      const transferCredits = await token.transferCredits();
      expect(transferCredits).to.eq(0);
    });
  });

  describe('setHasFixedSupply', async () => {
    it('requires SPC governance (anonymous)');
    it('requires SPC governance (member)');
    it('requires SPC governance (governor)');
    it('changes the state of the fixed supply flag');
  });

  describe('mint', async () => {
    let historyMock: FakeContract<FastHistory>;

    before(async () => {
      historyMock = await smock.fake('FastHistory');
      reg.connect(spcGovernor).setHistoryAddress(historyMock.address);
    });

    after(async () => {
      reg.connect(spcGovernor).setHistoryAddress(history.address);
    });

    describe('with fixed supply', async () => {
      it('is allowed only once', async () => {
        await spcGovernedToken.mint(1000000, 'Attempt 1');
        const subject = spcGovernedToken.mint(1000000, 'Attempt 2');
        await expect(subject).to.revertedWith('');
      });
    });

    describe('with continuous supply', async () => {
      beforeEach(async () => {
        await token.connect(spcGovernor).setHasFixedSupply(false);
      });

      it('is allowed more than once', async () => {
        await spcGovernedToken.mint(1_000_000, 'Attempt 1');
        await spcGovernedToken.mint(1_000_000, 'Attempt 2');
        const subject = await token.totalSupply();
        expect(subject).to.eq(2_000_000)
      });
    });

    it('requires SPC governance (anonymous)', async () => {
      const subject = token.mint(5_000, 'Attempt 1');
      await expect(subject).to.revertedWith('Missing SPC governorship');
    });

    it('requires SPC governance (member)', async () => {
      await access.connect(governor).addMember(alice.address);
      const subject = token.connect(alice).mint(5_000, 'Attempt 1');
      await expect(subject).to.revertedWith('Missing SPC governorship');
    });

    it('requires SPC governance (governor)', async () => {
      const subject = governedToken.mint(5_000, 'Attempt 1');
      await expect(subject).to.revertedWith('Missing SPC governorship');
    });

    it('delegates to the history contract', async () => {
      await spcGovernedToken.mint(5_000, 'Attempt 1');
      expect(historyMock.addMintingProof.getCall(0).args[0]).to.be.equals(5_000);
      expect(historyMock.addMintingProof.getCall(0).args[1]).to.be.equals('Attempt 1');
    });

    it('adds the minted tokens to the zero address', async () => {
      await spcGovernedToken.mint(3_000, 'Attempt 1');
      const subject = await token.balanceOf(ZERO_ADDRESS);
      expect(subject).to.eq(3_000);
    });

    it('adds the minted tokens to the total supply', async () => {
      await spcGovernedToken.mint(3_000, 'Attempt 1');
      const subject = await token.totalSupply();
      expect(subject).to.eq(3_000);
    });
  });

  /// Tranfer Credit management.

  describe('addTransferCredits', async () => {
    it('', async () => {
    });
  });

  describe('drainTransferCredits', async () => {
    it('', async () => {
    });
  });

  /// ERC20 implementation.

  describe('balanceOf', async () => {
    it('', async () => {
    });
  });

  describe('transfer', async () => {
    it('', async () => {
    });
  });

  describe('transferWithRef', async () => {
    it('', async () => {
    });
  });

  describe('allowance', async () => {
    it('', async () => {
    });
  });

  describe('approve', async () => {
    it('', async () => {
    });
  });

  describe('transferFrom', async () => {
    it('', async () => {
    });
  });

  describe('transferFromWithRef', async () => {
    it('', async () => {
    });
  });

  /// ERC1404 implementation.

  describe('detectTransferRestriction', async () => {
    it('', async () => {
    });
  });

  describe('messageForTransferRestriction', async () => {
    it('', async () => {
    });
  });
});
