import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@openzeppelin/hardhat-upgrades";
import { checkNetwork, toBaseUnit } from "../utils";
import { StateManager } from '../StateManager';
import { deployLibrary } from "./libraries";
import { deploySpc } from "./spc";
import { deployFastAccess, deployFastHistory, deployFastRegistry, deployFastToken, mintTokens } from "./fast";
import { BigNumber } from "ethers";

interface BootstrapTaskParams {
  readonly spcGovernor: string;
  readonly governor: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly hasFixedSupply: number;
  readonly mint: number;
  readonly txCredits: number;
};

task("bootstrap", "Deploys everything needed to run the FAST network")
  .addParam('spcGovernor', 'The address of the SPC governor', undefined, types.string)
  .addParam('governor', 'The address of the SPC', '', types.string)
  .addOptionalParam('name', 'The name for the new FAST', 'Consilience Ventures Digital Share', types.string)
  .addOptionalParam('symbol', 'The symbol for the new FAST', 'CVDS', types.string)
  .addOptionalParam('decimals', 'The decimals for the new FAST', 18, types.int)
  .addOptionalParam('txCredits', 'The number of credits available for this new FAST', 50000, types.int)
  .addOptionalParam('mint', 'How many tokens to initially mint and transfer to the governor', 1000000, types.int)
  .addOptionalParam('hasFixedSupply', 'When set to `true`, minting will be disabled forever for this FAST', true, types.boolean)
  .setAction(async (params, hre) => {
    checkNetwork(hre);

    // Prepare a state manager.
    const { addressSetLib, spc, registry, access, history, token } = await bootstrap(hre, params);

    const stateManager = new StateManager(31337);
    stateManager.state = { AddressSetLib: addressSetLib.address, Spc: spc.address };

    console.log('Operation summary:');
    console.log('  AddressSetLib', addressSetLib.address);
    console.log('  Spc', spc.address);
    console.log('  FastRegistry', registry.address);
    console.log('  FastAccess', access.address);
    console.log('  FastHistory', history.address);
    console.log('  FastToken', token.address);
    console.log('  Bootstrapping done!');
  });

async function bootstrap(hre: HardhatRuntimeEnvironment, params: BootstrapTaskParams) {
  // Deploy all needed libraries.
  const addressSetLib = await deployLibrary(hre, 'AddressSetLib');

  // Deploy the main SPC contract.
  const spc = await deploySpc(hre, addressSetLib.address, params.spcGovernor);

  // First, deploy a registry contract.
  const registry = await deployFastRegistry(hre, spc.address);
  console.log('Deployed FastRegistry', registry.address);

  // First, deploy an access contract, required for the FAST permissioning.
  const access = await deployFastAccess(hre, addressSetLib.address, registry.address, params.governor);
  console.log('Deployed Access', access.address);
  // Tell our registry where our access contract is.
  await registry.setHistoryAddress(access.address);

  // We can now deploy a history contract.
  const history = await deployFastHistory(hre, registry.address);
  console.log('Deployed FastHistory', history.address);
  // Tell our registry where our history contract is.
  await registry.setHistoryAddress(history.address);

  // We can finally deploy our token contract.
  const token = await deployFastToken(hre, registry.address, params);
  console.log('Deployed FastToken', token.address);
  // Tell our registry where our token contract is.
  await registry.setTokenAddress(token.address);

  // // Deploy an access contract, and then a token contract.
  // const fastAccess = await deployFastAccess(hre, addressSetLib.address, spc.address, params.governor);
  // const fastToken = await deployFastToken(hre, fastAccess.address, params);
  // // At this point, we can start minting a few tokens.
  // await mintTokens(fastToken, params.governor, toBaseUnit(BigNumber.from(params.mint), BigNumber.from(params.decimals)), "Bootstrap mint");

  return { addressSetLib, spc, registry, access, history, token };
}

export { bootstrap };
