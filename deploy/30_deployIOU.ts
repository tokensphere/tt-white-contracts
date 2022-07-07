import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployFast } from '../tasks/fast';
import { Exchange, Fast } from '../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, getNamedAccounts } = hre;
  const { spcMember } = await getNamedAccounts();
  const spcMemberSigner = await ethers.getSigner(spcMember);

  const exchange = (await ethers.getContract('Exchange')).connect(spcMemberSigner) as Exchange;
  exchange.addMember(spcMember);

  await deployFast(hre, {
    governor: spcMember,
    name: 'Consilience X Stable Coin',
    symbol: 'IOU',
    decimals: 18,
    hasFixedSupply: false,
    isSemiPublic: true
  });

  const iou = await ethers.getContract<Fast>('FastIOU');
  (await iou.connect(spcMemberSigner).addTransferCredits('0xd3c21bcecceda1000000')).wait();
};
func.tags = ['DeployIOU'];
export default func;
