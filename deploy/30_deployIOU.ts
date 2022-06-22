import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployFast } from '../tasks/fast';
import { Fast } from '../typechain';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, getNamedAccounts } = hre;
  const { spcMember } = await getNamedAccounts();
  const spcMemberSigner = await ethers.getSigner(spcMember);

  await deployFast(hre, {
    governor: spcMember,
    name: 'Consilience X Stable Coin',
    symbol: 'IOU',
    decimals: 18,
    hasFixedSupply: false,
    isSemiPublic: true
  });

  const iou = await ethers.getContract('FastIOU') as Fast;
  await iou.connect(spcMemberSigner).addTransferCredits('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
};
func.tags = ['DeployIOU'];
export default func;
