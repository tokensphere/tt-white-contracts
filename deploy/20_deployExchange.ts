import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployExchange } from '../tasks/exchange';
import { deployments } from 'hardhat';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployExchange(hre, (await deployments.get('Spc')).address);
};
func.tags = ['DeployExchange'];
export default func;
