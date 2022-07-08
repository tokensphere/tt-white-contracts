import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, getNamedAccounts } from 'hardhat';
import { deployFast, fastMint } from '../tasks/fast';
import { Exchange, Fast } from '../typechain';
import { toBaseUnit, ZERO_ADDRESS } from '../src/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // We only want to do this in local development nodes.
  const { name: netName } = hre.network;
  if (netName != 'hardhat' && netName != 'localhost' && netName != 'dev' && netName != 'staging') { return; }

  const {
    fastGovernor, spcMember,
    user1, user2, user3, user4, user5, user6, user7, user8, user9, user10
  } = await getNamedAccounts();
  // Grab various accounts.
  const spcMemberSigner = await ethers.getSigner(spcMember);
  const fastGovernorSigner = await ethers.getSigner(fastGovernor);
  // Grab handles to the Exchange.
  const exchange = await ethers.getContract<Exchange>('Exchange');
  const spcMemberExchange = exchange.connect(spcMemberSigner);
  // Grab handles to the IOU FAST.
  const iou = await ethers.getContract<Fast>('FastIOU');
  const governedIOU = iou.connect(spcMemberSigner);

  console.log('Minting 1_000_000 IOU...');
  await fastMint(governedIOU, 1_000_000, 'Initial mint');

  console.log('Deploying F01 FAST...');
  const { fast: f01 } = await deployFast(hre, {
    governor: fastGovernor,
    name: 'Fixed-supply Semi-public 18',
    symbol: 'F01',
    decimals: 18,
    hasFixedSupply: true,
    isSemiPublic: true
  });
  console.log('Minting 500_000 F01...');
  await fastMint(f01.connect(spcMemberSigner), 500_000, 'Whatever');

  console.log('Deploying F02 FAST...');
  const { fast: f02 } = await deployFast(hre, {
    governor: fastGovernor,
    name: 'Fixed-supply Private 5',
    symbol: 'F02',
    decimals: 5,
    hasFixedSupply: true,
    isSemiPublic: false
  });
  console.log('Minting 5_000_000 F02...');
  await fastMint(f02.connect(spcMemberSigner), 5_000_000, 'Whatever');

  console.log('Deploying F03 FAST...');
  const { fast: f03 } = await deployFast(hre, {
    governor: fastGovernor,
    name: 'Continuous-supply Semi-public 10',
    symbol: 'F03',
    decimals: 10,
    hasFixedSupply: false,
    isSemiPublic: true
  });
  console.log('Minting 5_000_000 F03...');
  await fastMint(f03.connect(spcMemberSigner), 5_000_000, 'Whatever');

  console.log('Deploying F04 FAST...');
  const { fast: f04 } = await deployFast(hre, {
    governor: fastGovernor,
    name: 'Continuous-supply Private 0',
    symbol: 'F04',
    decimals: 0,
    hasFixedSupply: false,
    isSemiPublic: true
  });
  console.log('Minting 5_000_000 F04...');
  await fastMint(f04.connect(spcMemberSigner), 5_000_000, 'Whatever');
};
func.tags = ['SeedStagingEnv'];
export default func;
