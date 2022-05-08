import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@openzeppelin/hardhat-upgrades";
import { checkNetwork, fromBaseUnit } from "../utils";
import { StateManager } from '../StateManager';
import { deployLibrary } from "./libraries";
import { deploySpc } from "./spc";
import { deployFastAccess, deployFastHistory, deployFastRegistry, deployFastToken, mintTokens } from "./fast";

interface BootstrapTaskParams {
  readonly spcGovernor: string;
  readonly governor: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly hasFixedSupply: number;
  readonly txCredits: number;
  readonly mint: number;
};

task("bootstrap", "Deploys everything needed to run the FAST network")
  .addParam('spcGovernor', 'The address of the SPC governor', undefined, types.string)
  .addParam('governor', 'The address of the SPC', '', types.string)
  .addOptionalParam('name', 'The name for the new FAST', 'Consilience Ventures Digital Share', types.string)
  .addOptionalParam('symbol', 'The symbol for the new FAST', 'CVDS', types.string)
  .addOptionalParam('decimals', 'The decimals for the new FAST', 18, types.int)
  .addOptionalParam('hasFixedSupply', 'When set to `true`, minting will be disabled forever for this FAST', true, types.boolean)
  .addOptionalParam('txCredits', 'The number of credits available for this new FAST', 50000, types.int)
  .addOptionalParam('mint', 'How many tokens to initially mint and transfer to the governor', 1000000, types.int)
  .setAction(async (params, hre) => {
    checkNetwork(hre);

    // Prepare a state manager.
    const {
      addressSetLib, paginationLib,
      spc,
      registry, access, history, token,
      symbol, decimals, baseAmount
    } = await bootstrap(hre, params);

    console.log('Deployed AddressSetLib', addressSetLib.address);
    console.log('Deployed PaginationLib', paginationLib.address);

    console.log('Deployed FastRegistry', registry.address);
    console.log('Deployed Access', access.address);
    console.log('Deployed FastHistory', history.address);
    console.log('Deployed FastToken', token.address);

    console.log(`Minted ${symbol}:`);
    console.log(`  In base unit: =${baseAmount}`);
    console.log(`    Human unit: ~${fromBaseUnit(baseAmount, decimals)} (${decimals} decimals truncated)`);

    const stateManager = new StateManager(31337);
    stateManager.state = {
      AddressSetLib: addressSetLib.address,
      PaginationLib: paginationLib.address,
      Spc: spc.address
    };
  });

async function bootstrap(hre: HardhatRuntimeEnvironment, params: BootstrapTaskParams) {
  // Deploy all needed libraries.
  const addressSetLib = await deployLibrary(hre, 'AddressSetLib');
  const paginationLib = await deployLibrary(hre, 'PaginationLib');

  // Deploy the main SPC contract.
  const spc = await deploySpc(hre, addressSetLib.address, params.spcGovernor);

  // First, deploy a registry contract.
  const registry = await deployFastRegistry(hre, spc.address);

  // First, deploy an access contract, required for the FAST permissioning.
  const access = await deployFastAccess(hre, addressSetLib.address, paginationLib.address, registry.address, params.governor);
  // Tell our registry where our access contract is.
  await registry.setHistoryAddress(access.address);

  // We can now deploy a history contract.
  const history = await deployFastHistory(hre, paginationLib.address, registry.address);
  // Tell our registry where our history contract is.
  await registry.setHistoryAddress(history.address);

  // We can finally deploy our token contract.
  const token = await deployFastToken(hre, registry.address, params);
  // Tell our registry where our token contract is.
  await registry.setTokenAddress(token.address);

  // At this point, we can start minting a few tokens.
  const { symbol, decimals, baseAmount } = await mintTokens(token, params.mint, 'Bootstrap initial mint');

  return { addressSetLib, paginationLib, spc, registry, access, history, token, symbol, decimals, baseAmount };
}

export { bootstrap };
