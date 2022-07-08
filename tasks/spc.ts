import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { COMMON_DIAMOND_FACETS, deploymentSalt } from '../src/utils';
import { Spc, SpcInitFacet } from '../typechain'

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
  const { ethers, getNamedAccounts, deployments: { diamond } } = hre;
  const { deployer } = await getNamedAccounts();

  // Deploy the diamond with an additional initialization facet.
  const deploy = await diamond.deploy('Spc', {
    from: deployer,
    owner: deployer,
    facets: [...SPC_FACETS, 'SpcInitFacet'],
    deterministicSalt: deploymentSalt(hre),
    log: true
  });

  // Initialize the diamond. We are doing it in two steps, because the SPC member is different
  // in each environment, and this would make our deployment transaction different in each and
  // therefore defeat the deterministic deployment strategy.
  const init = await ethers.getContractAt('SpcInitFacet', deploy.address) as SpcInitFacet;
  await (await init.initialize({ member: spcMember })).wait();

  // Return a handle to the diamond.
  return await ethers.getContractAt('Spc', deploy.address);
}

export { SPC_FACETS, deploySpc };
