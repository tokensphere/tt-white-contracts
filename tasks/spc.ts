import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { COMMON_DIAMOND_FACETS, deploymentSalt } from '../src/utils';
import { Spc } from '../typechain'

// Tasks.

interface SpcDeployParams {
  readonly member: string;
};

task('spc-deploy', 'Deploys the main SPC contract')
  .addParam('member', 'The SPC member address', undefined, types.string)
  .setAction(async ({ member }: SpcDeployParams, hre) => {
    await deploySpc(hre, member);
  });

interface SpcUpdateFacetsParams {
}

task('spc-update-facets', 'Updates facets of our SPC')
  .setAction(async (params: SpcUpdateFacetsParams, hre) => {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts()
    // Make sure that the fast is known from our tooling.
    const { address } = await deployments.get('Spc');
    console.log(`Updating SPC diamond facets at ${address}...`);
    await deployments.diamond.deploy('Spc', {
      from: deployer,
      facets: SPC_FACETS,
      deterministicSalt: deploymentSalt(hre),
      log: true
    });
  });

// Reusable functions.

const SPC_FACETS = [
  ...COMMON_DIAMOND_FACETS,
  'SpcTopFacet',
  'SpcAccessFacet',
  'SpcFrontendFacet'
];

async function deploySpc(hre: HardhatRuntimeEnvironment, spcMember: string)
  : Promise<Spc> {
  const { ethers, deployments, getNamedAccounts, deployments: { diamond } } = hre;
  const { deployer } = await getNamedAccounts();

  let deploy = await deployments.getOrNull('Spc');
  if (deploy) {
    console.log(`Spc already deployed at ${deploy.address}, skipping deployment.`);
  } else {
    console.log('Deploying Spc...');
    // Deploy the diamond with an additional initialization facet.
    deploy = await diamond.deploy('Spc', {
      from: deployer,
      owner: deployer,
      facets: [...SPC_FACETS, 'SpcInitFacet'],
      deterministicSalt: deploymentSalt(hre),
      log: true
    });
  }
  const spc = await ethers.getContract<Spc>('Spc');

  if (!(await spc.memberCount()).isZero()) {
    console.log('Spc already initialized, skipping initialization.');
  }
  else {
    console.log('Initializing Spc...');
    // Initialize the diamond. We are doing it in two steps, because the SPC member is different
    // in each environment, and this would make our deployment transaction different in each and
    // therefore defeat the deterministic deployment strategy.
    const spcInitFacet = await ethers.getContractAt('SpcInitFacet', deploy.address);
    await (await spcInitFacet.initialize({ member: spcMember })).wait();
  }

  // Return a handle to the diamond.
  return spc;
}

export { SPC_FACETS, deploySpc };
