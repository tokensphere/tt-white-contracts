import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployExchange } from '../tasks/exchange';
import { deployments } from 'hardhat';
import { wait } from '../src/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { address: spcAddr } = await deployments.get('Spc');
  await deployExchange(hre, spcAddr);
  
  await wait(8000);
};
func.tags = ['DeployExchange'];
export default func;
