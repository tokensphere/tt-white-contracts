import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYER_FACTORY_COMMON } from '../src/utils';
import { Spc, Exchange, SpcInitFacet } from '../typechain'

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
  .setAction(async (params: SpcUpdateFacetsParams, { deployments, getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts()
    // Make sure that the fast is known from our tooling.
    const { address } = await deployments.get('Spc');
    console.log(`Updating SPC diamond facets at ${address}...`);
    await deployments.diamond.deploy('Spc', {
      from: deployer,
      facets: SPC_FACETS,
      deterministicSalt: DEPLOYER_FACTORY_COMMON.salt,
      log: true
    });
  });

// Reusable functions.

const SPC_FACETS = [
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
    deterministicSalt: DEPLOYER_FACTORY_COMMON.salt,
    log: true
  });

  // Initialize the diamond. We are doing it in two steps, because the SPC member is different
  // in each environment, and this would make our deployment transaction different in each and
  // therefore defeat the deterministic deployment strategy.
  const init = await ethers.getContractAt('SpcInitFacet', deploy.address) as SpcInitFacet;
  await init.initialize({ member: spcMember });

  // Return a handle to the diamond.
  return await ethers.getContractAt('Spc', deploy.address);
}

export { SPC_FACETS, deploySpc };
