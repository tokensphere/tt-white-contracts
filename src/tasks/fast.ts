import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { BigNumber, Contract } from 'ethers';
import '@openzeppelin/hardhat-upgrades';
import { checkNetwork, fromBaseUnit, toBaseUnit, ZERO_ADDRESS } from '../utils';
import { StateManager } from '../StateManager';
import { FastToken } from '../../typechain-types/contracts/FastToken';
import { Spc, Exchange, FastRegistry, FastAccess, FastHistory } from '../../typechain-types';

// Tasks.

interface FastDeployParams {
  readonly exchange: string;
  readonly governor: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly hasFixedSupply: boolean;
  readonly isSemiPublic: boolean;
  readonly txCredits: number;
  readonly mint?: number;
};

task('fast-deploy', 'Deploys a FAST')
  .addParam('governor', 'The address of the FAST governor', undefined, types.string)
  .addParam('name', 'The name for the new FAST', undefined, types.string)
  .addParam('symbol', 'The symbol for the new FAST', undefined, types.string)
  .addOptionalParam('decimals', 'The decimals for the new FAST', 18, types.int)
  .addParam('hasFixedSupply', 'The minting scheme for the new FAST', undefined, types.boolean)
  .addParam('isSemiPublic', 'Whether or not this FAST should be semi-public', undefined, types.boolean)
  .addParam('txCredits', 'The number of credits available for this new FAST', undefined, types.int)
  .addOptionalParam('mint', 'How many tokens to initially mint and transfer to the governor', undefined, types.int)
  .setAction(async (params: FastDeployParams, hre) => {
    checkNetwork(hre);

    const stateManager = new StateManager();
    // Check for contracts and libraries...
    if (!stateManager.state.Spc) { throw 'Missing SPC contract'; }
    else if (!stateManager.state.Exchange) { throw 'Missing Exchange contract'; }
    else if (!stateManager.state.AddressSetLib) { throw 'Missing AddressSetLib library' }
    else if (!stateManager.state.PaginationLib) { throw 'Missing PaginationLib library' }

    const addressSetLib = await hre.ethers.getContractAt('AddressSetLib', stateManager.state.AddressSetLib);
    const paginationLib = await hre.ethers.getContractAt('PaginationLib', stateManager.state.PaginationLib);
    const helpersLib = await hre.ethers.getContractAt('HelpersLib', stateManager.state.HelpersLib);

    // Grab a handle on the deployed SPC contract.
    const spc = await hre.ethers.getContractAt('Spc', stateManager.state.Spc);
    const [[spcMemberAddr],] = await spc.paginateMembers(0, 1);
    const spcMember = await hre.ethers.getSigner(spcMemberAddr);
    // Grab a handle on the deployed Exchange contract.
    const exchange = await hre.ethers.getContractAt('Exchange', stateManager.state.Exchange);

    // Check that symbol isn't taken.
    const existingAddr = await spc.fastRegistryBySymbol(params.symbol);
    if (existingAddr != ZERO_ADDRESS) {
      throw `It seems that a FAST was already deployed at ${existingAddr} with symbol ${params.symbol}!`;
    }

    // First, deploy a registry contract.
    const reg = await deployFastRegistry(hre, helpersLib, spc, exchange);
    const spcMemberRegistry = reg.connect(spcMember);
    console.log('Deployed FastRegistry', reg.address);

    // First, deploy an access contract, required for the FAST permissioning.
    const access = await deployFastAccess(hre, addressSetLib, paginationLib, reg, params.governor);
    console.log('Deployed FastAccess', access.address);
    // Tell our registry where our access contract is.
    await spcMemberRegistry.setAccessAddress(access.address);

    // We can now deploy a history contract.
    const history = await deployFastHistory(hre, paginationLib, reg);
    console.log('Deployed FastHistory', history.address);
    // Tell our registry where our history contract is.
    await spcMemberRegistry.setHistoryAddress(history.address);

    // We can finally deploy our token contract.
    const token = await deployFastToken(hre, addressSetLib, paginationLib, reg, params);
    const spcMemberToken = token.connect(spcMember);
    console.log('Deployed FastToken', token.address);
    // Tell our registry where our token contract is.
    await spcMemberRegistry.setTokenAddress(token.address);

    // Register our newly created FAST registry into the SPC.
    await spc.connect(spcMember).registerFastRegistry(reg.address);

    // Add transfer credits.
    spcMemberToken.addTransferCredits(params.txCredits);
    console.log(`Added transfer credits`);

    // At this point, we can start minting a few tokens if requested.
    if (params.mint) {
      const { symbol, decimals, baseAmount } = await fastMint(spcMemberToken, params.mint, 'Bootstrap initial mint');
      // Also add transfer credits.
      await fastAddTransferCredits(spcMemberToken, params.mint);
      console.log(`Minted ${symbol}:`);
      console.log(`  In base unit: =${baseAmount}`);
      console.log(`    Human unit: ~${fromBaseUnit(baseAmount, decimals)} (${decimals} decimals truncated)`);
    }
  });

interface FastMintParams {
  readonly fastSymbol: string;
  readonly account: string;
  readonly amount: number;
  readonly ref: string;
};

task('fast-mint', 'Mints FASTs to a specified recipient')
  .addPositionalParam('fastSymbol', 'The FAST Token symbol to operate on', undefined, types.string)
  .addParam('amount', 'The amount of tokens to mint', undefined, types.int)
  .addParam('ref', 'The reference to use for the minting operation', undefined, types.string)
  .setAction(async (params: FastMintParams, hre) => {
    checkNetwork(hre);

    const stateManager = new StateManager();
    // Check for contracts and libraries...
    if (!stateManager.state.Spc) { throw 'Missing SPC contract'; }

    // Grab a handle on the deployed SPC contract.
    const spc = await hre.ethers.getContractAt('Spc', stateManager.state.Spc);
    const [[spcMemberAddr],] = await spc.paginateMembers(0, 1);
    // Grab a signer to the SPC member.
    const spcMember = await hre.ethers.getSigner(spcMemberAddr);

    // Grab a handle of the registry for the given FAST symbol.
    const regAddr = await spc.fastRegistryBySymbol(params.fastSymbol);
    if (regAddr == ZERO_ADDRESS) {
      throw (`No FAST registry can be found for symbol ${params.fastSymbol}!`);
    }
    const reg = await hre.ethers.getContractAt('FastRegistry', regAddr);
    // Grab a handle on the token contract.
    const tokenAddr = await reg.token();
    if (tokenAddr == ZERO_ADDRESS) {
      throw (`A FAST registry was found at ${params.fastSymbol}, but it does not hold a FAST token address!`);
    }
    const token = await hre.ethers.getContractAt('FastToken', tokenAddr);

    const { symbol, decimals, baseAmount } = await fastMint(token.connect(spcMember), params.amount, params.ref);
    console.log(`Minted ${symbol}:`);
    console.log(`  In base unit: =${baseAmount}`);
    console.log(`    Human unit: ~${fromBaseUnit(baseAmount, decimals)} (${decimals} decimals truncated)`);
  });

interface FastAddTransferCreditsParamms {
  readonly fastSymbol: string;
  readonly credits: number;
};

task('fast-add-transfer-credits', 'Increases the transfer credits for a given FAST Token')
  .addPositionalParam('fastSymbol', 'The FAST Token symbol to operate on', undefined, types.string)
  .addPositionalParam('credits', 'How many credits should be added', undefined, types.int)
  .setAction(async (params: FastAddTransferCreditsParamms, hre) => {

    const stateManager = new StateManager();
    // Check for contracts and libraries...
    if (!stateManager.state.Spc) { throw 'Missing SPC contract'; }

    // Grab a handle on the deployed SPC contract.
    const spc = await hre.ethers.getContractAt('Spc', stateManager.state.Spc);
    const [[spcMemberAddr],] = await spc.paginateMembers(0, 1);
    // Grab a signer to the SPC member.
    const spcMember = await hre.ethers.getSigner(spcMemberAddr);

    // Grab a handle of the registry for the given FAST symbol.
    const regAddr = await spc.fastRegistryBySymbol(params.fastSymbol);
    if (regAddr == ZERO_ADDRESS) {
      throw (`No FAST registry can be found for symbol ${params.fastSymbol}!`);
    }
    const reg = await hre.ethers.getContractAt('FastRegistry', regAddr);
    // Grab a handle on the token contract.
    const tokenAddr = await reg.token();
    if (tokenAddr == ZERO_ADDRESS) {
      throw (`A FAST registry was found at ${params.fastSymbol}, but it does not hold a FAST token address!`);
    }
    const token = await hre.ethers.getContractAt('FastToken', tokenAddr);

    await fastAddTransferCredits(token.connect(spcMember), params.credits);
  });

interface FastBalanceParams {
  readonly fastSymbol: string;
  readonly account: string;
};

task('fast-balance', 'Retrieves the balance of a given account')
  .addPositionalParam('fastSymbol', 'The FAST symbol to operate on', undefined, types.string)
  .addParam('account', 'The account to retrieve the balance of', undefined, types.string)
  .setAction(async (params: FastBalanceParams, hre) => {
    checkNetwork(hre);

    const stateManager = new StateManager();
    // Check for contracts and libraries...
    if (!stateManager.state.Spc) { throw 'Missing SPC contract'; }

    // Grab a handle on the deployed SPC contract.
    const spc = await hre.ethers.getContractAt('Spc', stateManager.state.Spc);
    const [[spcMemberAddr],] = await spc.paginateMembers(0, 1);
    // Grab a signer to the SPC member.
    const spcMember = await hre.ethers.getSigner(spcMemberAddr);

    // Grab a handle of the registry for the given FAST symbol.
    const regAddr = await spc.fastRegistryBySymbol(params.fastSymbol);
    if (regAddr == ZERO_ADDRESS) {
      throw (`No FAST registry can be found for symbol ${params.fastSymbol}!`);
    }
    const reg = await hre.ethers.getContractAt('FastRegistry', regAddr);
    // Grab a handle on the token contract.
    const tokenAddr = await reg.token();
    if (tokenAddr == ZERO_ADDRESS) {
      throw (`A FAST registry was found at ${params.fastSymbol}, but it does not hold a FAST token address!`);
    }
    const token = await hre.ethers.getContractAt('FastToken', tokenAddr);

    const decimals = await token.decimals();
    const symbol = await token.symbol();
    const baseBalance = await token.balanceOf(params.account);
    console.log('Blah')
    console.log(`${symbol} balance of ${params.account}:`);
    console.log(`  In base unit: =${baseBalance}`);
    console.log(`    Human unit: ~${fromBaseUnit(baseBalance, decimals)} (${decimals} decimals truncated)`);
  });

/// Reusable functions.

// Deploys a FAST Registry contract.
async function deployFastRegistry(
  { ethers, upgrades }: HardhatRuntimeEnvironment,
  helpersLib: Contract,
  spc: Spc,
  exchange: Exchange
): Promise<FastRegistry> {
  const libraries = { HelpersLib: helpersLib.address };
  const regFactory = await ethers.getContractFactory('FastRegistry', { libraries });
  return await upgrades.deployProxy(regFactory, [spc.address, exchange.address]) as FastRegistry;
};

// Deploys a new FAST Access contract.
async function deployFastAccess(
  { ethers, upgrades }: HardhatRuntimeEnvironment,
  addressSetLib: Contract,
  paginationLib: Contract,
  reg: FastRegistry,
  member: string
): Promise<FastAccess> {
  const libraries = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address }
  const accessFactory = await ethers.getContractFactory('FastAccess', { libraries });
  return await upgrades.deployProxy(accessFactory, [reg.address, member]) as FastAccess;
}

// Deploys a FAST History contract.
async function deployFastHistory(
  { ethers, upgrades }: HardhatRuntimeEnvironment,
  paginationLib: Contract,
  reg: FastRegistry
): Promise<FastHistory> {
  const libraries = { PaginationLib: paginationLib.address };
  const historyFactory = await ethers.getContractFactory('FastHistory', { libraries });
  return await upgrades.deployProxy(historyFactory, [reg.address]) as FastHistory;
}

// Deploys a new FAST Token contract.
async function deployFastToken(
  { ethers, upgrades }: HardhatRuntimeEnvironment,
  paginationLib: Contract,
  addressSetLib: Contract,
  reg: FastRegistry,
  params: any
): Promise<FastToken> {
  const { name, symbol, decimals } = params;
  const { hasFixedSupply: hasFixedSupplyInput, isSemiPublic } = params;
  const hasFixedSupply = hasFixedSupplyInput === true || hasFixedSupplyInput === "true";

  // Deploy the token contract.
  const tokenLibs = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address };
  const tokenFactory = await ethers.getContractFactory('FastToken', { libraries: tokenLibs });
  return await upgrades.deployProxy(tokenFactory, [{
    registry: reg.address,
    name,
    symbol,
    decimals,
    hasFixedSupply,
    isSemiPublic
  }]) as FastToken;
}

async function fastMint(token: FastToken, amount: number | BigNumber, ref: string) {
  const decimals = await token.decimals();
  const symbol = await token.symbol();
  const baseAmount = toBaseUnit(BigNumber.from(amount), decimals);
  await token.mint(baseAmount, ref);
  return { symbol, decimals, baseAmount };
}

async function fastAddTransferCredits(token: FastToken, credits: number | BigNumber) {
  const decimals = await token.decimals();
  await token.addTransferCredits(toBaseUnit(BigNumber.from(credits), decimals));
}

export {
  deployFastRegistry,
  deployFastAccess,
  deployFastHistory,
  deployFastToken,
  fastMint,
  fastAddTransferCredits
};
