import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_SALT } from '../src/utils';
import { Spc, Exchange } from '../typechain'

interface SpcDeployParams {
  readonly deployer: string;
  readonly member: string;
};

task('spc-deploy', 'Deploys the main SPC contract')
  .addPositionalParam('deployer', 'Who is deploying')
  .addParam('member', 'The SPC member address', undefined, types.string)
  .setAction(async ({ member }: SpcDeployParams, hre) => {
    await deploySpc(hre, member);
    await deployExchange(hre);
  });

async function deploySpc(hre: HardhatRuntimeEnvironment, spcMember: string): Promise<Spc> {
  const { ethers, deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // We deploy our SPC contract.
  const spcDeploy = await deploy('Spc', {
    from: deployer,
    deterministicDeployment: DEPLOYMENT_SALT,
    args: [spcMember],
    log: true
  });
  const spc = await ethers.getContractAt('Spc', spcDeploy.address) as Spc;
  const spcFactory = ethers.getContractFactory('Spc');
  // Provision the SPC with Eth.
  await spc.provisionWithEth({ value: ethers.utils.parseEther('500') });
  // Much wow.
  return spc;
}

async function deployExchange(hre: HardhatRuntimeEnvironment): Promise<Exchange> {
  const { ethers, deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const spcAddr = await (await deployments.get('Spc')).address;

  // We deploy our SPC contract.
  const exchangeDeploy = await deploy('Exchange', {
    from: deployer,
    deterministicDeployment: DEPLOYMENT_SALT,
    args: [spcAddr],
    log: true
  });
  return await ethers.getContractAt('Exchange', exchangeDeploy.address) as Exchange;
}

export { deploySpc, deployExchange };
