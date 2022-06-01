import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployExchange } from '../tasks/spc';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  await deployExchange(hre);
};
func.tags = ['Exchange'];
func.dependencies = ['Spc'];

export default func;
