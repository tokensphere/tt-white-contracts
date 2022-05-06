import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { BigNumber, Contract } from 'ethers';
import '@openzeppelin/hardhat-upgrades';
import { checkNetwork, fromBaseUnit, toBaseUnit } from '../utils';
import { StateManager } from '../StateManager';
import { upgrades } from 'hardhat';

// Tasks.

interface FastDeployParams {
  readonly governor: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly hasFixedSupply: boolean;
};

task('fast-deploy', 'Deploys a FAST')
  .addParam('governor', 'The address of the SPC', undefined, types.string)
  .addParam('name', 'The name for the new FAST', undefined, types.string)
  .addParam('symbol', 'The symbol for the new FAST', undefined, types.string)
  .addOptionalParam('decimals', 'The decimals for the new FAST', 18, types.int)
  .addOptionalParam('hasFixedSupply', 'The minting scheme for the new FAST', true, types.boolean)
  .setAction(async (taskParams: FastDeployParams, hre) => {
    checkNetwork(hre);

    // Check current state.
    const stateManager = new StateManager(31337);
    // Check for libraries...
    if (!stateManager.state.AddressSetLib) { throw 'Missing AddressSetLib library' }
    // Check for the parent SPC contract...
    else if (!stateManager.state.Spc) { throw 'Missing Spc contract' }

    const addressSetLibAddr: string = stateManager.state.AddressSetLib;
    const spcAddr: string = stateManager.state.Spc;

    // First, deploy a registry contract.
    const registry = await deployFastRegistry(hre, spcAddr);
    console.log('Deployed FastRegistry', registry.address);

    // First, deploy an access contract, required for the FAST permissioning.
    const access = await deployFastAccess(hre, addressSetLibAddr, registry.address, taskParams.governor);
    console.log('Deployed Access', access.address);
    // Tell our registry where our access contract is.
    await registry.setHistoryAddress(access.address);

    // We can now deploy a history contract.
    const history = await deployFastHistory(hre, registry.address);
    console.log('Deployed FastHistory', history.address);
    // Tell our registry where our history contract is.
    await registry.setHistoryAddress(history.address);

    // We can finally deploy our token contract.
    const token = await deployFastToken(hre, registry.address, taskParams);
    console.log('Deployed FastToken', token.address);
    // Tell our registry where our token contract is.
    await registry.setTokenAddress(token.address);
  });

interface FastMintParams {
  readonly fast: string;
  readonly account: string;
  readonly amount: number;
  readonly ref: string;
};

task('fast-mint', 'Mints FASTs to a specified recipient')
  .addPositionalParam('fast', 'The FAST address to operate on', undefined, types.string)
  .addParam('amount', 'The amount of tokens to mint', undefined, types.int)
  .addParam('ref', 'The reference to use for the minting operation', undefined, types.string)
  .setAction(async (params: FastMintParams, hre) => {
    checkNetwork(hre);

    const { ethers } = hre;
    const fast = await ethers.getContractAt('FastToken', params.fast);
    const { symbol, decimals, baseAmount } = await mintTokens(fast, params.amount, params.ref);
    console.log(`Minted ${symbol}:`);
    console.log(`  In base unit: =${baseAmount}`);
    console.log(`    Human unit: ~${fromBaseUnit(baseAmount, decimals)} (${decimals} decimals truncated)`);
  })

interface FastBalanceParams {
  readonly fast: string;
  readonly account: string;
};

task('fast-balance', 'Retrieves the balance of a given account')
  .addPositionalParam('fast', 'The FAST address to operate on', undefined, types.string)
  .addParam('account', 'The account to retrieve the balance of', undefined, types.string)
  .setAction(async (params: FastBalanceParams, hre) => {
    checkNetwork(hre);

    const { ethers } = hre;
    const fast = await ethers.getContractAt('FastToken', params.fast);

    const decimals: BigNumber = await fast.decimals();
    const symbol: string = await fast.symbol();
    const baseBalance: BigNumber = await fast.balanceOf(params.account);
    console.log(`${symbol} balance of ${params.account}:`);
    console.log(`  In base unit: =${baseBalance}`);
    console.log(`    Human unit: ~${fromBaseUnit(baseBalance, decimals)} (${decimals} decimals truncated)`);
  })

/// Reusable functions.

// Deploys a FAST Registry contract.
async function deployFastRegistry({ ethers, upgrades }: HardhatRuntimeEnvironment, spcAddr: string) {
  const Registry = await ethers.getContractFactory('FastRegistry');
  return await upgrades.deployProxy(Registry, [spcAddr]);
};

// Deploys a new FAST Access contract.
async function deployFastAccess(
  { ethers, upgrades }: HardhatRuntimeEnvironment,
  addressSetLibAddr: string,
  spcAddr: string,
  governor: string) {
  const libraries = { AddressSetLib: addressSetLibAddr }
  const Access = await ethers.getContractFactory('FastAccess', { libraries });
  return await upgrades.deployProxy(Access, [spcAddr, governor]);
}

// Deploys a FAST History contract.
async function deployFastHistory({ ethers, upgrades }: HardhatRuntimeEnvironment, registryAddress: string) {
  const History = await ethers.getContractFactory('FastHistory');
  return await upgrades.deployProxy(History, [registryAddress]);
}

// Deploys a new FAST Token contract.
async function deployFastToken(
  { ethers, upgrades }: HardhatRuntimeEnvironment,
  accessAddress: string,
  taskParams: any) {
  const { name, symbol, decimals } = taskParams;
  const { hasFixedSupply } = taskParams;
  const hasFixedSupplyBool = hasFixedSupply === true || hasFixedSupply === "true";

  // Then, we can deploy our FAST contract.
  const Token = await ethers.getContractFactory('FastToken');
  return upgrades.deployProxy(Token, [accessAddress, name, symbol, decimals, hasFixedSupplyBool]);
}

async function mintTokens(fast: Contract, amount: number | BigNumber, ref: string) {
  const decimals: BigNumber = await fast.decimals();
  const symbol: string = await fast.symbol();
  const baseAmount = toBaseUnit(BigNumber.from(amount), decimals);
  await fast.mint(baseAmount, ref);
  return { symbol, decimals, baseAmount };
}

export { deployFastRegistry, deployFastAccess, deployFastHistory, deployFastToken, mintTokens };
