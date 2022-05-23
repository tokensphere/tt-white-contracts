import { task, types } from 'hardhat/config';
import '@openzeppelin/hardhat-upgrades';
import { checkNetwork } from '../utils';
import { StateManager } from '../StateManager';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Spc__factory, Spc, Exchange, Exchange__factory } from '../../typechain-types';

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

    const addressSetLibAddr: string = stateManager.state.AddressSetLib;
    const paginationLibAddr: string = stateManager.state.PaginationLib;
    const helpersLibAddr: string = stateManager.state.HelpersLib;
    const spc = await deploySpc(hre, addressSetLibAddr, paginationLibAddr, helpersLibAddr, params.member);
    console.log('Deployed Spc', spc.address);

    const exchange = await deployExchange(hre, spc);
    console.log('Deployed Exchange', exchange.address);
  });

async function deploySpc(
  { ethers, upgrades }: HardhatRuntimeEnvironment,
  addressSetLibAddr: string,
  paginationLibAddr: string,
  helpersLibAddr: string,
  member: string): Promise<Spc> {
  // We deploy our SPC contract.
  const libraries = { AddressSetLib: addressSetLibAddr, PaginationLib: paginationLibAddr, HelpersLib: helpersLibAddr };
  const spcFactory = await ethers.getContractFactory('Spc', { libraries }) as Spc__factory;
  const spc = await upgrades.deployProxy(spcFactory, [member]) as Spc;
  // Provision the SPC with Eth.
  await spc.provisionWithEth({ value: ethers.utils.parseEther('500') });

  // Much wow.
  return spc;
}

async function deployExchange(
  { ethers, upgrades }: HardhatRuntimeEnvironment,
  spc: Spc
): Promise<Exchange> {
  const exchangeFactory = await ethers.getContractFactory('Exchange') as Exchange__factory;
  return await upgrades.deployProxy(exchangeFactory, [spc.address]) as Exchange;
}

export { deploySpc, deployExchange };
