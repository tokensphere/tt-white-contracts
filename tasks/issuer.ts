import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { COMMON_DIAMOND_FACETS, deploymentSalt } from "../src/utils";
import { Issuer } from "../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";

// Tasks.

interface IssuerDeployParams {
  readonly member: string;
}

task("issuer-deploy", "Deploys the main Issuer contract")
  .addParam("member", "The Issuer member address", undefined, types.string)
  .setAction(async ({ member }: IssuerDeployParams, hre) => {
    await deployIssuer(hre, member);
  });

interface IssuerUpdateFacetsParams {}

task("issuer-update-facets", "Updates facets of our Issuer").setAction(
  async (_params: IssuerUpdateFacetsParams, hre) => {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    // Make sure that the fast is known from our tooling.
    const { address } = await deployments.get("Issuer");
    console.log(`Updating Issuer diamond facets at ${address}...`);
    await deployments.diamond.deploy("Issuer", {
      from: deployer,
      facets: ISSUER_FACETS,
      log: true,
    });
  }
);

// Reusable functions.

const ISSUER_FACETS = [
  ...COMMON_DIAMOND_FACETS,
  "IssuerInitFacet",
  "IssuerTopFacet",
  "IssuerAccessFacet",
  "IssuerAutomatonsFacet",
  "IssuerFrontendFacet",
];

const deployIssuer = async (
  hre: HardhatRuntimeEnvironment,
  issuerMember: string
): Promise<Issuer> => {
  const {
    ethers,
    deployments,
    getNamedAccounts,
    deployments: { diamond },
  } = hre;
  const { deployer } = await getNamedAccounts();

  let deploy = await deployments.getOrNull("Issuer");
  if (deploy) {
    console.log(
      `Issuer already deployed at ${deploy.address}, skipping deployment.`
    );
  } else {
    console.log("Deploying Issuer...");
    // Deploy the diamond with an additional initialization facet.
    deploy = await diamond.deploy("Issuer", {
      log: true,
      from: deployer,
      owner: deployer,
      facets: ISSUER_FACETS,
    });
  }

  // Grab a handle to the deployed diamond.
  const issuer = await ethers.getContractAt<Issuer>("Issuer", deploy.address);

  if (!(await issuer.memberCount()).isZero())
    console.log("Issuer already initialized, skipping initialization.");
  else {
    console.log("Initializing Issuer...");
    await (await issuer.initialize({ member: issuerMember })).wait();
  }

  // Return a handle to the diamond.
  return issuer;
};

export { ISSUER_FACETS, deployIssuer };
