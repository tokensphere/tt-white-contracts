import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployExchange } from '../tasks/exchange';
import { deployments } from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { address: spcAddr } = await deployments.get('Spc');
  await deployExchange(hre, spcAddr);
};
func.tags = ['DeployExchange'];
export default func;
