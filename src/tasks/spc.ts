import { task, types } from 'hardhat/config';
import '@openzeppelin/hardhat-upgrades';
import { checkNetwork } from '../utils';
import { StateManager } from '../StateManager';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Spc, Spc__factory } from '../../typechain-types';

interface SpcDeployParams {
  readonly member: string;
};

task('spc-deploy', 'Deploys the main SPC contract')
  .addParam('member', 'The SPC member address', undefined, types.string)
  .setAction(async (params: SpcDeployParams, hre) => {
    checkNetwork(hre);

    const stateManager = new StateManager(31337);
    // Check for libraries...
    if (!stateManager.state.AddressSetLib) { throw 'Missing AddressSetLib' }
    else if (!stateManager.state.PaginationLib) { throw 'Missing PaginationLib' }
    else if (!stateManager.state.HelpersLib) { throw 'Missing HelpersLib' }

    const addressSetLibAddr: string = stateManager.state.AddressSetLib;
    const paginationLibAddr: string = stateManager.state.PaginationLib;
    const helpersLibAddr: string = stateManager.state.HelpersLib;
    const spc = await deploySpc(hre, addressSetLibAddr, paginationLibAddr, helpersLibAddr, params.member);
    console.log('Deployed Spc', spc.address);
  });

async function deploySpc(
  { ethers, upgrades }: HardhatRuntimeEnvironment,
  addressSetLibAddr: string,
  paginationLibAddr: string,
  helpersLibAddr: string,
  member: string): Promise<Spc> {
  // We deploy our SPC contract.
  const libraries = { AddressSetLib: addressSetLibAddr, PaginationLib: paginationLibAddr, HelpersLib: helpersLibAddr };
  const Spc = await ethers.getContractFactory('Spc', { libraries }) as Spc__factory;
  const spc = await upgrades.deployProxy(Spc, [member]) as Spc;
  // Provision the SPC with Eth.
  await spc.provisionWithEth({ value: ethers.utils.parseEther('500') });

  // Much wow.
  return spc;
}

export { deploySpc };
