import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deploySpc } from '../tasks/spc';
import { getNamedAccounts } from 'hardhat';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { spcMember } = await getNamedAccounts();
  await deploySpc(hre, spcMember);
};
func.tags = ['DeploySpc'];
export default func;
