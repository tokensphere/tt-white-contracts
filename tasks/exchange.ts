import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { COMMON_DIAMOND_FACETS, deploymentSalt } from '../src/utils';
import { Exchange } from '../typechain'

// Tasks.

interface ExchangeDeployParams {
};

task('exchange-deploy', 'Deploys the main SPC contract')
  .setAction(async ({ }: ExchangeDeployParams, hre) => {
    const { address: spcAddr } = await hre.deployments.get('Spc');
    await deployExchange(hre, spcAddr);
  });

interface ExchangeUpdateFacetsParams {
}

task('exchange-update-facets', 'Updates facets of our SPC')
  .setAction(async (params: ExchangeUpdateFacetsParams, hre) => {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts()
    // Make sure that the fast is known from our tooling.
    const { address } = await deployments.get('Exchange');
    console.log(`Updating Exchange diamond facets at ${address}...`);
    await deployments.diamond.deploy('Exchange', {
      from: deployer,
      facets: EXCHANGE_FACETS,
      deterministicSalt: deploymentSalt(hre),
      log: true
    });
  });

// Reusable functions.

const EXCHANGE_FACETS = [
  ...COMMON_DIAMOND_FACETS,
  'ExchangeTopFacet',
  'ExchangeAccessFacet',
  'ExchangeTokenHoldersFacet'
];

const deployExchange = async (hre: HardhatRuntimeEnvironment, spcAddr: string): Promise<Exchange> => {
  const { ethers, deployments, getNamedAccounts } = hre;
  const { diamond } = deployments;
  const { deployer } = await getNamedAccounts();

  let deploy = await deployments.getOrNull('Exchange');
  if (deploy) {
    console.log(`Exchange already deployed at ${deploy.address}, skipping.`);
  } else {
    // Deploy the diamond with an additional initialization facet.
    deploy = await diamond.deploy('Exchange', {
      from: deployer,
      owner: deployer,
      facets: EXCHANGE_FACETS,
      execute: {
        contract: 'ExchangeInitFacet',
        methodName: 'initialize',
        args: [{ spc: spcAddr }]
      },
      deterministicSalt: deploymentSalt(hre),
      log: true
    });
  }
  // Return a handle to the diamond.
  return await ethers.getContract<Exchange>('Exchange');
}

export { EXCHANGE_FACETS, deployExchange };
