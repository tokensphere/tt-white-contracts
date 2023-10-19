import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { parseEther } from "ethers/lib/utils";
import { deploymentSalt } from "../src/utils";
import { Paymaster } from "../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";

// Tasks.

interface PaymasterDeployParams { }

task("paymaster-deploy", "Deploys the main Paymaster contract").setAction(
  async (_params: PaymasterDeployParams, hre) => {
    const { address: marketplaceAddr } = await hre.deployments.get("Marketplace");
    await deployPaymaster(hre, marketplaceAddr);
  }
);

interface PaymasterUpdateFacetsParams { }

task("paymaster-update-facets", "Updates facets of our Paymaster")
  .setAction(async (_params: PaymasterUpdateFacetsParams, hre) => {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    // Make sure that the fast is known from our tooling.
    const { address } = await deployments.get("Paymaster");
    console.log(`Updating paymaster diamond facets at ${address}...`);
    await deployments.diamond.deploy("Paymaster", {
      from: deployer,
      facets: PAYMASTER_FACETS,
      deterministicSalt: deploymentSalt(hre),
      log: true,
    });
  });


interface PaymasterFundParams { }

task("paymaster-fund", "Funds the Paymaster")
  .setAction(async (_params: PaymasterFundParams, hre) => {
    const { deployments, getNamedAccounts } = hre;
    // Who will juice it?
    const { issuerMember } = await getNamedAccounts();

    // yeeettttttt this out...
    const relayHubAddress = "0x3232f21A6E08312654270c78A773f00dd61d60f5";
    const { address: paymasterAddress } = await deployments.get("Paymaster");

    const RelayHub = await hre.ethers.getContractFactory("RelayHub");
    const relayHub = await RelayHub.attach(relayHubAddress);

    // params...
    const tx = await relayHub.depositFor(paymasterAddress, { value: parseEther("0.1") });
    await tx.wait();

    console.log('Paymaster balance:', await relayHub.balanceOf(paymasterAddress));
    // console.log('Admin wallet balance', await provider.getBalance(admin.address));
  });

// Reusable functions and constants.

const PAYMASTER_FACETS = [
  "PaymasterTopFacet"
];

const deployPaymaster = async (
  hre: HardhatRuntimeEnvironment,
  marketplaceAddr: string
): Promise<Paymaster> => {
  const { ethers, deployments, getNamedAccounts } = hre;
  const { diamond } = deployments;
  const { deployer } = await getNamedAccounts();

  let deploy = await deployments.getOrNull("Paymaster");
  if (deploy) {
    console.log(`Paymaster already deployed at ${deploy.address}, skipping.`);
  } else {
    // Deploy the diamond with an additional initialization facet.
    deploy = await diamond.deploy("Paymaster", {
      from: deployer,
      owner: deployer,
      facets: PAYMASTER_FACETS,
      execute: {
        contract: "PaymasterInitFacet",
        methodName: "initialize",
        args: [{ marketplace: marketplaceAddr }],
      },
      deterministicSalt: deploymentSalt(hre),
      log: true,
      excludeSelectors: {
        "PaymasterTopFacet": ["supportsInterface"]
      }
    });
  }
  // Return a handle to the diamond.
  return await ethers.getContract<Paymaster>("Paymaster");
};

export { PAYMASTER_FACETS, deployPaymaster };