import { task, types } from 'hardhat/config';
import '@openzeppelin/hardhat-upgrades';
import { checkNetwork } from '../utils';
import { StateManager } from '../StateManager';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Spc__factory, Spc, Exchange, Exchange__factory } from '../../typechain-types';
import { Contract } from 'ethers';

interface SpcDeployParams {
  readonly member: string;
};

task('spc-deploy', 'Deploys the main SPC contract')
  .addParam('member', 'The SPC member address', undefined, types.string)
  .setAction(async (params: SpcDeployParams, hre) => {
    checkNetwork(hre);

    const stateManager = new StateManager();
    // Check for libraries...
    if (!stateManager.state.AddressSetLib) { throw 'Missing AddressSetLib' }
    else if (!stateManager.state.PaginationLib) { throw 'Missing PaginationLib' }
    else if (!stateManager.state.HelpersLib) { throw 'Missing HelpersLib' }

    const addressSetLib = await hre.ethers.getContractAt('AddressSetLib', stateManager.state.AddressSetLib);
    const paginationLib = await hre.ethers.getContractAt('PaginationLib', stateManager.state.PaginationLib);
    const helpersLib = await hre.ethers.getContractAt('HelpersLib', stateManager.state.HelpersLib);

    const helpersLibAddr: string = stateManager.state.HelpersLib;
    const spc = await deploySpc(hre, addressSetLib, paginationLib, helpersLib, params.member);
    console.log('Deployed Spc', spc.address);

    const exchange = await deployExchange(hre, addressSetLib, paginationLib, spc);
    console.log('Deployed Exchange', exchange.address);
  });

async function deploySpc(
  { ethers, upgrades }: HardhatRuntimeEnvironment,
  addressSetLib: Contract,
  paginationLib: Contract,
  helpersLib: Contract,
  member: string): Promise<Spc> {
  // We deploy our SPC contract.
  const libraries = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address, HelpersLib: helpersLib.address };
  const spcFactory = await ethers.getContractFactory('Spc', { libraries }) as Spc__factory;
  const spc = await upgrades.deployProxy(spcFactory, [member]) as Spc;
  // Provision the SPC with Eth.
  await spc.provisionWithEth({ value: ethers.utils.parseEther('500') });

  // Much wow.
  return spc;
}

async function deployExchange(
  { ethers, upgrades }: HardhatRuntimeEnvironment,
  addressSetLib: Contract,
  paginationLib: Contract,
  spc: Spc
): Promise<Exchange> {
  const libraries = { AddressSetLib: addressSetLib.address, PaginationLib: paginationLib.address };
  const exchangeFactory = await ethers.getContractFactory('Exchange', { libraries }) as Exchange__factory;
  return await upgrades.deployProxy(exchangeFactory, [spc.address]) as Exchange;
}

export { deploySpc, deployExchange };
