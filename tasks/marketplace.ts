import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { COMMON_DIAMOND_FACETS, deploymentSalt } from "../src/utils";
import { Marketplace } from "../typechain";

// Tasks.

interface MarketplaceDeployParams {}

task("marketplace-deploy", "Deploys the main Marketplace contract").setAction(
  async (_params: MarketplaceDeployParams, hre) => {
    const { address: issuerAddr } = await hre.deployments.get("Issuer");
    await deployMarketplace(hre, issuerAddr);
  },
);

interface MarketplaceUpdateFacetsParams {}

task("marketplace-update-facets", "Updates facets of our Marketplace").setAction(
  async (_params: MarketplaceUpdateFacetsParams, hre) => {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    // Make sure that the fast is known from our tooling.
    const { address } = await deployments.get("Marketplace");
    console.log(`Updating Marketplace diamond facets at ${address}...`);
    await deployments.diamond.deploy("Marketplace", {
      from: deployer,
      facets: MARKETPLACE_FACETS,
      deterministicSalt: deploymentSalt(hre),
      log: true,
    });
  },
);

// Reusable functions.

const MARKETPLACE_FACETS = [
  ...COMMON_DIAMOND_FACETS,
  "MarketplaceTopFacet",
  "MarketplaceAccessFacet",
  "MarketplaceTokenHoldersFacet",
  "MarketplaceAutomatonsFacet",
];

const deployMarketplace = async (hre: HardhatRuntimeEnvironment, issuerAddr: string): Promise<Marketplace> => {
  const { ethers, deployments, getNamedAccounts } = hre;
  const { diamond } = deployments;
  const { deployer } = await getNamedAccounts();

  let deploy = await deployments.getOrNull("Marketplace");
  if (deploy) {
    console.log(`Marketplace already deployed at ${deploy.address}, skipping.`);
  } else {
    // Deploy the diamond with an additional initialization facet.
    deploy = await diamond.deploy("Marketplace", {
      from: deployer,
      owner: deployer,
      facets: MARKETPLACE_FACETS,
      execute: {
        contract: "MarketplaceInitFacet",
        methodName: "initialize",
        args: [{ issuer: issuerAddr }],
      },
      deterministicSalt: deploymentSalt(hre),
      log: true,
    });
  }
  // Return a handle to the diamond.
  return await ethers.getContract<Marketplace>("Marketplace");
};

export { MARKETPLACE_FACETS, deployMarketplace };
