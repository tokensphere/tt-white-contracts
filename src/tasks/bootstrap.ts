import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@openzeppelin/hardhat-upgrades";
import { checkNetwork, fromBaseUnit } from "../utils";
import { StateManager } from '../StateManager';
import { deployLibrary } from "./libraries";
import { deploySpc } from "./spc";
import {
  deployFastAccess,
  deployFastHistory,
  deployFastRegistry,
  deployFastToken,
  fastMint,
  fastAddTransferCredits
} from "./fast";

interface BootstrapTaskParams {
  readonly spcMember: string;
  readonly governor: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly hasFixedSupply: number;
  readonly txCredits: number;
  readonly mint: number;
};

task("bootstrap", "Deploys everything needed to run the FAST network")
  .addParam('spcMember', 'The address of the SPC member', undefined, types.string)
  .addParam('governor', 'The address of the SPC', undefined, types.string)
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

    console.log('==========');
    console.log('Deployed AddressSetLib', addressSetLib.address);
    console.log('Deployed PaginationLib', paginationLib.address);
    console.log('==========');
    console.log('Deployed SPC', spc.address);
    console.log('==========');
    console.log('Deployed FastRegistry', registry.address);
    console.log('Deployed FastAccess', access.address);
    console.log('Deployed FastHistory', history.address);
    console.log('Deployed FastToken', token.address);
    console.log('==========');
    console.log(`Minted ${symbol}:`);
    console.log(`  In base unit: =${baseAmount}`);
    console.log(`    Human unit: ~${fromBaseUnit(baseAmount, decimals)} (${decimals} decimals truncated)`);
    console.log('==========');

    const stateManager = new StateManager(31337);
    stateManager.state = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address };
  });

async function bootstrap(hre: HardhatRuntimeEnvironment, params: BootstrapTaskParams) {
  // Deploy all needed libraries.
  const addressSetLib = await deployLibrary(hre, 'AddressSetLib');
  const paginationLib = await deployLibrary(hre, 'PaginationLib');

  // Grab a signer to the SPC member.
  const spcMember = await hre.ethers.getSigner(params.spcMember);

  // Deploy the main SPC contract.
  const spc = await deploySpc(hre, addressSetLib.address, paginationLib.address, params.spcMember);

  // First, deploy a registry contract.
  const registry = await deployFastRegistry(hre, spc.address);
  const spcMemberRegistry = registry.connect(spcMember);

  // First, deploy an access contract, required for the FAST permissioning.
  const access = await deployFastAccess(hre, addressSetLib.address, paginationLib.address, registry.address, params.governor);
  // Tell our registry where our access contract is.
  await spcMemberRegistry.setAccessAddress(access.address);

  // We can now deploy a history contract.
  const history = await deployFastHistory(hre, paginationLib.address, registry.address);
  // Tell our registry where our history contract is.
  await spcMemberRegistry.setHistoryAddress(history.address);

  // We can finally deploy our token contract.
  const token = await deployFastToken(hre, registry.address, params);
  const spcMemberToken = token.connect(spcMember);
  // Tell our registry where our token contract is.
  await spcMemberRegistry.setTokenAddress(token.address);

  // At this point, we can start minting a few tokens.
  const { symbol, decimals, baseAmount } = await fastMint(spcMemberToken, params.mint, 'Bootstrap initial mint');
  // Also add some transfer credits.
  await fastAddTransferCredits(spcMemberToken, params.mint * 10);

  return {
    addressSetLib, paginationLib,
    spc, registry, access, history, token,
    symbol, decimals, baseAmount
  };
}

export { bootstrap };
