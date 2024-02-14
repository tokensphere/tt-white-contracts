import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ZERO_ADDRESS, deploymentSalt, gasAdjustments } from "../src/utils";
import { Paymaster } from "../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
import { RelayHub, StakeManager } from "@opengsn/contracts";
import { BigNumber } from "ethers";
import { IERC20 } from "../typechain";

// Tasks.

interface PaymasterDeployParams { }

task("paymaster-deploy", "Deploys the main Paymaster contract").setAction(
  async (_params: PaymasterDeployParams, hre) => {
    const { address: marketplaceAddr } = await hre.deployments.get("Marketplace");
    const { address: issuerAddr } = await hre.deployments.get("Issuer");
    await deployPaymaster(hre, marketplaceAddr, issuerAddr);
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
      excludeSelectors: {
        "PaymasterTopFacet": ["supportsInterface"]
      }
    });
  });

/**
 * This should only be called in development environments.
 * I've prefixed this task for now...
 * TODO: Split this up... some is for the dev environment and some is for the mainnet environment.
*/

interface PaymasterStakeParams {
  readonly amount: BigNumber;
  readonly stakeTokenAddress: string;
  readonly relayHubAddress: string;
  readonly relayManagerAddress: string;
  readonly relayWorkerAddress: string;
  readonly stakeManagerAddress: string;
}

task("dev-paymaster-relay-setup", "Setup task for the relay")
  .addParam("stakeTokenAddress", "The token to stake with", undefined, types.string)
  .addParam("stakeManagerAddress", "The stake manager address", undefined, types.string)
  .addParam("relayManagerAddress", "The relay manager address", undefined, types.string)
  .addParam("relayWorkerAddress", "The relay worker address", undefined, types.string)
  .addParam("relayHubAddress", "The RelayHub address", undefined, types.string)
  .addParam("amount", "The amount of ETH to stake the RelayHub with", undefined, types.int)
  .setAction(async (params: PaymasterStakeParams, hre) => {
    const { ethers, getNamedAccounts } = hre;

    // Why user1?
    // We're using user1 as it's the owner of the relay hub etc.
    const { user1 } = await getNamedAccounts();
    const ownerSigner = await ethers.getSigner(user1);

    const seedAmountForRelayAccounts = ethers.utils.parseEther("0.5");

    console.log("Depositing ETH/MATIC to relay manager and worker accounts...");
    await (await ownerSigner.sendTransaction({ to: params.relayManagerAddress, value: seedAmountForRelayAccounts })).wait();
    await (await ownerSigner.sendTransaction({ to: params.relayWorkerAddress, value: seedAmountForRelayAccounts })).wait();

    // Get a handle to the stake token.
    const stakeToken = await ethers.getContractAt<IERC20>("IERC20", params.stakeTokenAddress);

    console.log("Approving the stake token...");
    await (await stakeToken.connect(ownerSigner).approve(
      params.stakeManagerAddress, params.amount
    )).wait();

    // We can't use the deployment artifact etc for the ABI so manually adding it here.
    const stakeManager = await ethers.getContractAt<StakeManager>([
      "function stakeForRelayManager(address, address, uint256, uint256) external",
      "function authorizeHubByOwner(address relayManager, address relayHub) external"
    ], params.stakeManagerAddress);

    const stakeManagerAsOwner = stakeManager.connect(ownerSigner);

    console.log("Authorizing hub...");
    await (await stakeManagerAsOwner.authorizeHubByOwner(
      params.relayManagerAddress,
      params.relayHubAddress
    )).wait();

    console.log("Staking for relay manager...");
    await (await stakeManagerAsOwner.stakeForRelayManager(
      params.stakeTokenAddress,
      params.relayManagerAddress,
      /* unstakeDelay */ 7 * 24 * 3600,
      params.amount
    )).wait();

    console.log("Setup for the relay complete... 🙌");
  });


interface PaymasterSetupParams {
  readonly relayHubAddress: string;
  readonly trustedForwarderAddress: string;
}

task("paymaster-setup", "Sets up the Paymaster")
  .addParam("relayHubAddress", "The relay hub address", undefined, types.string)
  .addParam("trustedForwarderAddress", "The trusted forwarder address", undefined, types.string)
  .setAction(async (params: PaymasterSetupParams, hre) => {

    const { ethers, getNamedAccounts } = hre;
    const { issuerMember } = await getNamedAccounts();
    const issuerMemberSigner = await ethers.getSigner(issuerMember);

    // Get a handle to the paymaster contract.
    const paymaster = await ethers.getContract<Paymaster>("Paymaster");
    const issuerPaymaster = paymaster.connect(issuerMemberSigner);

    console.log("Setting trusted forwarder and relay address...");
    await (await issuerPaymaster.setRelayHub(params.relayHubAddress)).wait();
    await (await issuerPaymaster.setTrustedForwarder(params.trustedForwarderAddress)).wait();
    console.log("... done");
  });

interface PaymasterFundParams {
  readonly amount: BigNumber;
}

// Why types.string? Because otherwise this will hit the max safe int size in JS.
task("paymaster-fund", "Funds the Paymaster")
  .addParam("amount", "The amount of ETH to fund the Paymaster with", undefined, types.string)
  .setAction(async (params: PaymasterFundParams, hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { issuerMember } = await getNamedAccounts();
    const issuerMemberSigner = await ethers.getSigner(issuerMember);

    // Get a handle to the paymaster contract.
    const paymaster = await ethers.getContract<Paymaster>("Paymaster");
    const issuerPaymaster = paymaster.connect(issuerMemberSigner);

    // Get the relay hub address using the address stored in the paymaster.
    const relayHubAddress = await paymaster.getRelayHub();

    if (relayHubAddress === ZERO_ADDRESS) {
      throw Error("Paymaster's RelayHub address has not been set!");
    }

    // We don't have access to a deployment artifact for the relay hub so manually adding the ABI here...
    const relayHub = await ethers.getContractAt<RelayHub>([
      "function balanceOf(address owner) public view returns (uint256)"
    ], relayHubAddress);

    console.log(`Funding RelayHub ${relayHubAddress} with ${params.amount} MATIC...`);

    // Fund the paymaster.
    await (await issuerPaymaster.deposit({ value: params.amount })).wait();

    console.log(`Paymaster balance with relay hub: ${await relayHub.balanceOf(paymaster.address)}`);
    console.log(`Admin wallet balance: ${await issuerMemberSigner.getBalance()}`);
  });

// Reusable functions and constants.

const PAYMASTER_FACETS = [
  "PaymasterTopFacet"
];

const deployPaymaster = async (
  hre: HardhatRuntimeEnvironment,
  marketplaceAddr: string,
  issuerAddr: string
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
        args: [{
          marketplace: marketplaceAddr,
          issuer: issuerAddr
        }],
      },
      deterministicSalt: deploymentSalt(hre),
      log: true,
      excludeSelectors: {
        "PaymasterTopFacet": ["supportsInterface"]
      },
      ...await gasAdjustments(hre),
    });
  }
  // Return a handle to the diamond.
  return await ethers.getContract<Paymaster>("Paymaster");
};

export { PAYMASTER_FACETS, deployPaymaster };