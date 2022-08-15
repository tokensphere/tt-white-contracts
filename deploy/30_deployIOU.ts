import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployFast } from '../tasks/fast';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { ethers, getNamedAccounts } = hre;
  const { issuerMember } = await getNamedAccounts();
  const issuerMemberSigner = await ethers.getSigner(issuerMember);

  const { fast: iou } = await deployFast(hre, {
    governor: issuerMember,
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
    (await iou.connect(issuerMemberSigner).addTransferCredits('0xd3c21bcecceda1000000')).wait();
  }
};
func.tags = ['DeployIOU'];
export default func;
