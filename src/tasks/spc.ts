import { task, types } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import { checkNetwork } from "../utils";
import { StateManager } from '../StateManager';
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Spc, Spc__factory } from "../../typechain-types";

interface SpcDeployParams {
  readonly member: string;
};

task("spc-deploy", "Deploys the main SPC contract")
  .addParam('member', 'The SPC member address', undefined, types.string)
  .setAction(async (params: SpcDeployParams, hre) => {
    checkNetwork(hre);

    const stateManager = new StateManager(31337);
    // Check for libraries...
    if (!stateManager.state.AddressSetLib) { throw 'Missing AddressSetLib library' }
    else if (!stateManager.state.PaginationLib) { throw 'Missing PaginationLib library' }

    const addressSetLibAddr: string = stateManager.state.AddressSetLib;
    const paginationLibAddr: string = stateManager.state.PaginationLib;
    const spc = await deploySpc(hre, addressSetLibAddr, paginationLibAddr, params.member);
    console.log('Deployed Spc', spc.address);
  });

async function deploySpc(
  { ethers, upgrades }: HardhatRuntimeEnvironment,
  addressSetLibAddr: string,
  paginationLibAddr: string,
  member: string): Promise<Spc> {
  // We deploy our SPC contract.
  const libraries = { AddressSetLib: addressSetLibAddr, PaginationLib: paginationLibAddr };
  const Spc = await ethers.getContractFactory("Spc", { libraries }) as Spc__factory;
  return await upgrades.deployProxy(Spc, [member]) as Spc;
}

export { deploySpc };
