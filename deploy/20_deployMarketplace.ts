import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployMarketplace } from '../tasks/marketplace';
import { deployments } from 'hardhat';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployMarketplace(hre, (await deployments.get('Issuer')).address);
};
func.tags = ['DeployMarketplace'];
export default func;
