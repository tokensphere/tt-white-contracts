import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { Spc } from '../typechain';
import { toBaseUnit } from '../src/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  // We only want to do this in local development nodes.
  const { ethers, getNamedAccounts } = hre;
  const { storage } = await getNamedAccounts();
  const storageSigner = await ethers.getSigner(storage);

  // Provision the SPC contract.
  const spc = await ethers.getContract<Spc>('Spc');
  if (!(await ethers.provider.getBalance(spc.address)).isZero()) {
    console.log('Spc already funded, skipping Spc funding.');
  } else {
    console.log(`Funding the SPC at ${spc.address} with 10_000 ETH...`);
    (await spc.connect(storageSigner).provisionWithEth({ value: toBaseUnit(10_000, 18) })).wait();
  }
};
func.tags = ['FundSpc'];
export default func;
