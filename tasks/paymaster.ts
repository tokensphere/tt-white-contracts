import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deploymentSalt } from "../src/utils";
import { Paymaster } from "../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
import { RelayHub } from "@opengsn/contracts";
import { BigNumber } from "ethers";

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


interface PaymasterFundParams {
  readonly amount: BigNumber;
}

task("paymaster-fund", "Funds the Paymaster")
  .addParam("amount", "The amount of ETH to fund the Paymaster with", undefined, types.int)
  .setAction(async (params: PaymasterFundParams, hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { issuerMember } = await getNamedAccounts();
    const issuerMemberSigner = await ethers.getSigner(issuerMember);

    // Get a handle to the paymaster contract.
    const paymaster = await ethers.getContract<Paymaster>("Paymaster");
    const issuerPaymaster = paymaster.connect(issuerMemberSigner);

    // Get the relay hub address using the address stored in the paymaster.
    const relayHubAddress = await paymaster.getRelayHub();
    const relayHub = await ethers.getContractAt<RelayHub>("RelayHub", relayHubAddress);

    // Fund the paymaster.
    const tx = await issuerPaymaster.deposit({ value: params.amount });
    await tx.wait();

    console.log('Paymaster balance with relay hub:', await relayHub.balanceOf(paymaster.address));
    console.log('Admin wallet balance', (await issuerMemberSigner.getBalance()).toString());
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