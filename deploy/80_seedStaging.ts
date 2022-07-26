import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployments, ethers, getNamedAccounts } from 'hardhat';
import { deployFast, fastMint } from '../tasks/fast';
import { Exchange, Fast } from '../typechain';
import { ZERO_ADDRESS } from '../src/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  // We only want to do this in local development nodes.
  const { name: netName } = hre.network;
  console.log(netName);
  if (netName != 'hardhat' && netName != 'localhost' && netName != 'dev'
    && netName != 'staging' && netName != 'mumbai') { return; }

  const { fastGovernor, spcMember } = await getNamedAccounts();
  // Grab various accounts.
  const spcMemberSigner = await ethers.getSigner(spcMember);
  // Grab handles to the Exchange.
  const exchange = await ethers.getContract<Exchange>('Exchange');
  // Grab handles to the IOU FAST.
  const iou = await ethers.getContract<Fast>('FastIOU');
  const governedIOU = iou.connect(spcMemberSigner);

  const zeroAddrBalance = await iou.balanceOf(ZERO_ADDRESS);
  const totalSupply = await iou.totalSupply();

  if (!zeroAddrBalance.add(totalSupply).isZero()) {
    console.log('IOU already minted, skipping minting.');
  } else {
    console.log('Minting 1_000_000 IOU...');
    await fastMint(governedIOU, 1_000_000, 'Initial mint');
  }

  {
    const deploy = await deployments.getOrNull('FastF01');
    if (deploy) {
      console.log('F01 already deployed, skipping deployment and minting.');
    } else {
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
    }
  }

  {
    const deploy = await deployments.getOrNull('FastF02');
    if (deploy) {
      console.log('F02 already deployed, skipping deployment and minting.');
    } else {
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
    }
  }

  {
    const deploy = await deployments.getOrNull('FastF03');
    if (deploy) {
      console.log('F03 already deployed, skipping deployment and minting.');
    } else {
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
    }
  }

  {
    const deploy = await deployments.getOrNull('FastF04');
    if (deploy) {
      console.log('F04 already deployed, skipping deployment and minting.');
    } else {
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
    }
  }
};
func.tags = ['SeedStagingEnv'];
export default func;
