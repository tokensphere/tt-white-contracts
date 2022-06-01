import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deploySpc } from '../tasks/spc';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { spcMember } = await hre.getNamedAccounts();
  await deploySpc(hre, spcMember);
};
func.tags = ['Spc'];

export default func;
