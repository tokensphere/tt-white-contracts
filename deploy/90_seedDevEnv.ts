import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, getNamedAccounts } from 'hardhat';
import { deployFast, fastMint } from '../tasks/fast';
import { Exchange, Fast } from '../typechain';
import { toBaseUnit, ZERO_ADDRESS } from '../src/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // We only want to do this in local development nodes.
  const { name: netName } = hre.network;
  if (netName != 'hardhat' && netName != 'localhost' && netName != 'dev') { return; }

  const {
    fastGovernor, spcMember,
    user1, user2, user3, user4, user5, user6, user7, user8, user9, user10
  } = await getNamedAccounts();
  // Grab various accounts.
  const spcMemberSigner = await ethers.getSigner(spcMember);
  const fastGovernorSigner = await ethers.getSigner(fastGovernor);
  // Grab handles to the Exchange.
  const exchange = await ethers.getContract('Exchange') as Exchange;
  // Grab handles to the IOU FAST.
  const iou = await ethers.getContract('FastIOU') as Fast;
  const spcMemberIOU = iou.connect(spcMemberSigner);

  console.log('Adding user[1-10] to the Exchange as members...');
  for (const address of [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10])
    await exchange.connect(spcMemberSigner).addMember(address);

  console.log('Minting 1_000_000 IOU...');
  await fastMint(spcMemberIOU, 1_000_000, 'Initial mint');

  console.log('Provisioning user[1, 4, 5, 8, 9] with some IOU...');
  for (const address of [user1, user4, user5, user8, user9])
    await spcMemberIOU.transferFrom(ZERO_ADDRESS, address, toBaseUnit(1_000, 18));

  console.log('Deploying SAF FAST...');
  const { fast: saf } = await deployFast(hre, {
    governor: fastGovernor,
    name: 'Sexy Awesome Frontend',
    symbol: 'SAF',
    decimals: 18,
    hasFixedSupply: false,
    isSemiPublic: true
  });
  console.log('Minting 500_000 SAF...');
  await fastMint(saf.connect(spcMemberSigner), 500_000, 'Whatever');
  console.log('Adding user[1-5] as members of the SAF FAST...');
  for (const address of [user1, user2, user3, user4, user5])
    await saf.connect(fastGovernorSigner).addMember(address);
  console.log('Transferring SAF to user[1-3]...');
  for (const [index, address] of [user1, user2, user3].entries())
    await saf.connect(fastGovernorSigner).transferFromWithRef(ZERO_ADDRESS, address, toBaseUnit(1_000 * (index + 1), 18), `Transfer ${index + 1}`);

  console.log('Deploying CVD FAST...');
  const { fast: cvd } = await deployFast(hre, {
    governor: fastGovernor,
    name: 'Consilience Video Domination',
    symbol: 'CVD',
    decimals: 5,
    hasFixedSupply: true,
    isSemiPublic: false
  });
  console.log('Minting 5_000_000 CVD...');
  await fastMint(cvd.connect(spcMemberSigner), 5_000_000, 'Whatever');
  console.log('Adding user[3-7] as members of the CVD FAST...');
  for (const address of [user3, user4, user5, user6, user7])
    await cvd.connect(fastGovernorSigner).addMember(address);
};
func.tags = ['SeedDevEnv'];
export default func;
