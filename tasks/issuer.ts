import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { COMMON_DIAMOND_FACETS, deploymentSalt } from '../src/utils';
import { Issuer } from '../typechain'

// Tasks.

interface IssuerDeployParams {
  readonly member: string;
};

task('issuer-deploy', 'Deploys the main Issuer contract')
  .addParam('member', 'The Issuer member address', undefined, types.string)
  .setAction(async ({ member }: IssuerDeployParams, hre) => {
    await deployIssuer(hre, member);
  });

interface IssuerUpdateFacetsParams {
}

task('issuer-update-facets', 'Updates facets of our Issuer')
  .setAction(async (params: IssuerUpdateFacetsParams, hre) => {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts()
    // Make sure that the fast is known from our tooling.
    const { address } = await deployments.get('Issuer');
    console.log(`Updating Issuer diamond facets at ${address}...`);
    await deployments.diamond.deploy('Issuer', {
      from: deployer,
      facets: ISSUER_FACETS,
      deterministicSalt: deploymentSalt(hre),
      log: true
    });
  });

// Reusable functions.

const ISSUER_FACETS = [
  ...COMMON_DIAMOND_FACETS,
  'IssuerTopFacet',
  'IssuerAccessFacet',
  'IssuerFrontendFacet'
];

const deployIssuer = async (hre: HardhatRuntimeEnvironment, issuerMember: string): Promise<Issuer> => {
  const { ethers, deployments, getNamedAccounts, deployments: { diamond } } = hre;
  const { deployer } = await getNamedAccounts();

  let deploy = await deployments.getOrNull('Issuer');
  if (deploy) {
    console.log(`Issuer already deployed at ${deploy.address}, skipping deployment.`);
  } else {
    console.log('Deploying Issuer...');
    // Deploy the diamond with an additional initialization facet.
    deploy = await diamond.deploy('Issuer', {
      from: deployer,
      owner: deployer,
      facets: [...ISSUER_FACETS, 'IssuerInitFacet'],
      deterministicSalt: deploymentSalt(hre),
      log: true
    });
  }
  const issuer = await ethers.getContract<Issuer>('Issuer');

  if (!(await issuer.memberCount()).isZero()) {
    console.log('Issuer already initialized, skipping initialization.');
  }
  else {
    console.log('Initializing Issuer...');
    // Initialize the diamond. We are doing it in two steps, because the Issuer member is different
    // in each environment, and this would make our deployment transaction different in each and
    // therefore defeat the deterministic deployment strategy.
    const issuerInitFacet = await ethers.getContractAt('IssuerInitFacet', deploy.address);
    await (await issuerInitFacet.initialize({ member: issuerMember })).wait();
  }

  // Return a handle to the diamond.
  return issuer;
}

export { ISSUER_FACETS, deployIssuer };
