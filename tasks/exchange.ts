import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYER_FACTORY_COMMON } from '../src/utils';
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
  .setAction(async (params: ExchangeUpdateFacetsParams, { deployments, getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts()
    // Make sure that the fast is known from our tooling.
    const { address } = await deployments.get('Exchange');
    console.log(`Updating Exchange diamond facets at ${address}...`);
    await deployments.diamond.deploy('Exchange', {
      from: deployer,
      facets: EXCHANGE_FACETS,
      deterministicSalt: DEPLOYER_FACTORY_COMMON.salt,
      log: true
    });
  });

// Reusable functions.

const EXCHANGE_FACETS = ['ExchangeTopFacet', 'ExchangeAccessFacet'];

async function deployExchange(hre: HardhatRuntimeEnvironment, spcAddr: string)
  : Promise<Exchange> {
  const { ethers, deployments, getNamedAccounts } = hre;
  const { diamond } = deployments;
  const { deployer } = await getNamedAccounts();

  // Deploy the diamond with an additional initialization facet.
  const { address } = await diamond.deploy('Exchange', {
    from: deployer,
    owner: deployer,
    facets: EXCHANGE_FACETS,
    execute: {
      contract: 'ExchangeInitFacet',
      methodName: 'initialize',
      args: [{ spc: spcAddr }]
    },
    deterministicSalt: DEPLOYER_FACTORY_COMMON.salt,
    log: true
  });
  // Return a handle to the diamond.
  return await ethers.getContractAt('Exchange', address) as Exchange;
}

export { EXCHANGE_FACETS, deployExchange };
