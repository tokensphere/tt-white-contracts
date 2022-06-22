import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYER_FACTORY_COMMON } from '../src/utils';
import { Spc, Exchange } from '../typechain'

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

const SPC_FACETS = ['SpcTopFacet', 'SpcFrontendFacet'];

async function deploySpc(hre: HardhatRuntimeEnvironment, spcMember: string)
  : Promise<Spc> {
  const { ethers, getNamedAccounts, deployments: { diamond } } = hre;
  const { deployer } = await getNamedAccounts();

  // Deploy the diamond with an additional initialization facet.
  const deploy = await diamond.deploy('Spc', {
    from: deployer,
    owner: deployer,
    facets: SPC_FACETS,
    execute: {
      contract: 'SpcInitFacet',
      methodName: 'initialize',
      args: [{ member: spcMember }]
    },
    deterministicSalt: DEPLOYER_FACTORY_COMMON.salt,
    log: true
  });

  // Return a handle to the diamond.
  return await ethers.getContractAt('Spc', deploy.address) as Spc;
}

export { SPC_FACETS, deploySpc };
