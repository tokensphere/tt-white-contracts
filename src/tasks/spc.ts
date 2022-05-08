import { task, types } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import { checkNetwork } from "../utils";
import { StateManager } from '../StateManager';
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Spc, Spc__factory } from "../../typechain-types";

interface SpcDeployParams {
  readonly governor: string;
};

task("spc-deploy", "Deploys the main SPC contract")
  .addParam('governor', 'The SPC governor address', undefined, types.string)
  .setAction(async (params: SpcDeployParams, hre) => {
    checkNetwork(hre);

    const stateManager = new StateManager(31337);
    // Check for libraries...
    if (!stateManager.state.AddressSetLib) { throw 'Missing AddressSetLib library' }
    // Already deployed?
    else if (stateManager.state.Spc) { throw `Already deployed at ${stateManager.state.Spc}` }

    const addressSetLibAddr: string = stateManager.state.AddressSetLib;
    const spc = await deploySpc(hre, addressSetLibAddr, params.governor);
    // We keep track of its address in our state file.
    stateManager.state = { ...stateManager.state, Spc: spc.address };
    console.log('Deployed Spc', spc.address);
  });

async function deploySpc(
  { ethers, upgrades }: HardhatRuntimeEnvironment,
  addressSetLibAddr: string,
  governor: string): Promise<Spc> {
  // We deploy our SPC contract.
  const libraries = { AddressSetLib: addressSetLibAddr }
  const Spc = await ethers.getContractFactory("Spc", { libraries }) as Spc__factory;
  return await upgrades.deployProxy(Spc, [governor]) as Spc;
}

export { deploySpc };
