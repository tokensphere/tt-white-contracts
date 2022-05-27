import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import '@openzeppelin/hardhat-upgrades';
import { checkNetwork } from '../utils';
import { StateManager } from '../StateManager';
import { Contract } from 'ethers';

// Tasks.

interface LibDeployParams {
  readonly name: string;
};

task('lib-deploy', 'Deploys the AddressSetLib library')
  .addPositionalParam('name', 'The name of the library to be deployed', undefined, types.string)
  .setAction(async (params: LibDeployParams, hre) => {
    checkNetwork(hre);

    const stateManager = new StateManager();
    // Check current state.
    if (stateManager.state[params.name]) { throw `Already deployed at ${stateManager.state[params.name]}` }

    // Deploy library.
    const lib = await deployLibrary(hre, params.name);
    // Update state.
    let newState: any = { ...stateManager.state };
    newState[params.name] = lib.address;
    stateManager.state = newState;
    console.log(`Deployed ${params.name}`, lib.address);
  });

// Reusable functions.

const deployLibrary = async (
  { ethers }: HardhatRuntimeEnvironment,
  name: string
): Promise<Contract> =>
  (await ethers.getContractFactory(name)).deploy();

export { deployLibrary };
