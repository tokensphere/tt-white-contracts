import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployFast } from '../tasks/fast';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { ethers, getNamedAccounts } = hre;
  const { spcMember } = await getNamedAccounts();
  const spcMemberSigner = await ethers.getSigner(spcMember);

  const { fast: iou } = await deployFast(hre, {
    governor: spcMember,
    name: 'Consilience X Stable Coin',
    symbol: 'IOU',
    decimals: 18,
    hasFixedSupply: false,
    isSemiPublic: true
  });

  if (!(await iou.transferCredits()).isZero()) {
    console.log('FastIOU already provisioned with transfer credits, skipping provisioning.');
  } else {
    console.log('Provisioning FastIOU with transfer credits...');
    (await iou.connect(spcMemberSigner).addTransferCredits('0xd3c21bcecceda1000000')).wait();
  }
};
func.tags = ['DeployIOU'];
export default func;
