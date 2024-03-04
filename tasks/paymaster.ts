import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ZERO_ADDRESS, deploymentSalt, gasAdjustments } from "../src/utils";
import { Marketplace, Issuer, Paymaster } from "../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
import { RelayHub, RelayHub__factory, StakeManager, StakeManager__factory } from "@opengsn/contracts";
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

// Specific tasks for the paymaster - funding etc.

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
  });

interface PaymasterFundParams {
  readonly amount: BigNumber;
}

// Why types.string for amount? Because otherwise this will hit the max safe int size in JS.
task("paymaster-fund", "Funds the Paymaster")
  .addParam("amount", "The amount of ETH to fund the Paymaster with (wei)", undefined, types.string)
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

    // Get a handle to the relay hub.
    const relayHub = await ethers.getContractAt<RelayHub>(
      abiFromFactory(RelayHub__factory),
      relayHubAddress
    );

    console.log(`Funding RelayHub ${relayHubAddress} with ${params.amount} MATIC...`);

    // Fund the paymaster.
    await (await issuerPaymaster.deposit({ value: params.amount })).wait();

    console.log(`Paymaster balance with relay hub: ${await relayHub.balanceOf(paymaster.address)}`);
    console.log(`Admin wallet balance: ${await issuerMemberSigner.getBalance()}`);
  });

interface PaymasterStakeSetupParams {
  readonly amount: BigNumber;
  readonly stakeTokenAddress: string;
  readonly relayHubAddress: string;
  readonly relayManagerAddress: string;
}

// Why types.string for amount? Because otherwise this will hit the max safe int size in JS.
task("paymaster-stake-setup", "Stakes the Relay")
  .addParam("stakeTokenAddress", "The token to stake with", undefined, types.string)
  .addParam("relayManagerAddress", "The relay manager address", undefined, types.string)
  .addParam("relayHubAddress", "The RelayHub address", undefined, types.string)
  .addParam("amount", "The amount of ETH to stake the RelayHub with (wei)", undefined, types.string)
  .setAction(async (params: PaymasterStakeSetupParams, hre) => {
    const { ethers, getNamedAccounts } = hre;

    // Why user1?
    // We're using user1 as it's the owner of the Relay Hub.
    const { user1 } = await getNamedAccounts();
    const ownerSigner = await ethers.getSigner(user1);

    // Get a handle to the stake token.
    const stakeToken = await ethers.getContractAt<IERC20>("IERC20", params.stakeTokenAddress);

    // Get a handle to the relay hub.
    const relayHub = await ethers.getContractAt<RelayHub>(
      abiFromFactory(RelayHub__factory),
      params.relayHubAddress
    );
    const relayHubAsOwner = relayHub.connect(ownerSigner);

    console.log("Getting the stake manager address...");
    const stakeManagerAddress = await relayHubAsOwner.getStakeManager();

    console.log(`Approving the stake token using stake manager at: ${stakeManagerAddress}...`);
    await (await stakeToken.connect(ownerSigner).approve(
      stakeManagerAddress, params.amount
    )).wait();

    // Get the configuration and stake info.
    const config = await relayHubAsOwner.getConfiguration();
    const minimumUnstakeDelay = config.minimumUnstakeDelay;

    // Get a handle to the stake manager.
    const stakeManager = await ethers.getContractAt<StakeManager>(
      abiFromFactory(StakeManager__factory),
      stakeManagerAddress
    );
    const stakeManagerAsOwner = stakeManager.connect(ownerSigner);

    // Using the minimum unstake delay as the unstake delay for now.
    console.log(`Staking for relay manager at: ${params.relayManagerAddress} with ${params.amount}...`);
    await (await stakeManagerAsOwner.stakeForRelayManager(
      params.stakeTokenAddress,
      params.relayManagerAddress,
      minimumUnstakeDelay,
      params.amount
    )).wait();

    // TODO: Check if the hub is already authorized

    console.log(`Authorizing hub at: ${params.relayHubAddress}...`);
    await (await stakeManagerAsOwner.authorizeHubByOwner(
      params.relayManagerAddress,
      params.relayHubAddress
    )).wait();

    console.log("Staking the Relay complete...");
  });

/**
 * This should only be called in development environments.
*/

interface DevPaymasterFundRelayParams {
  readonly relayManagerAddress: string;
  readonly relayWorkerAddress: string;
}

task("dev-fund-manager-and-worker", "Fund the manager and worker accounts")
  .addParam("relayManagerAddress", "The relay manager address", undefined, types.string)
  .addParam("relayWorkerAddress", "The relay worker address", undefined, types.string)
  .setAction(async (params: DevPaymasterFundRelayParams, hre) => {
    // Guard for non-dev environments.
    const { name: netName } = hre.network;
    if (netName !== "dev") {
      throw new Error("This task should only be called in development environments.");
    }

    const { ethers, getNamedAccounts } = hre;

    // Why user1?
    // We're using user1 as it's the owner of the relay hub etc.
    const { user1 } = await getNamedAccounts();
    const ownerSigner = await ethers.getSigner(user1);

    console.log("Owner address: ", ownerSigner.address);

    const seedAmountForRelayAccounts = ethers.utils.parseEther("0.2");

    console.log("Depositing ETH/MATIC to relay manager and worker accounts...");
    console.log(`Relay manager at: ${params.relayManagerAddress}...`);
    await (await ownerSigner.sendTransaction({ to: params.relayManagerAddress, value: seedAmountForRelayAccounts })).wait();
    console.log(`Relay worker at: ${params.relayWorkerAddress}...`);
    await (await ownerSigner.sendTransaction({ to: params.relayWorkerAddress, value: seedAmountForRelayAccounts })).wait();
  });

/**
* This should only be called in development environments.
*/

interface DevPaymasterAddMembersParams {
  readonly trustedForwarderAddress: string;
  readonly gaslessAccounts: string[];
}

task("dev-paymaster-add-members", "Adds members to the marketplace etc - for dev testing")
  .addParam("trustedForwarderAddress", "The relay manager address", undefined, types.string)
  .addParam("gaslessAccounts", "The relay manager address", undefined, types.string)
  .setAction(async (params: DevPaymasterAddMembersParams, hre) => {
    // Guard for non-dev environments.
    const { name: netName } = hre.network;
    if (netName !== "dev") {
      throw new Error("This task should only be called in development environments.");
    }

    console.log("Adding members to the issuer and marketplace contracts...");

    const { ethers, getNamedAccounts } = hre;
    const { issuerMember } = await getNamedAccounts();
    const issuerMemberSigner = await ethers.getSigner(issuerMember);

    const issuer = await ethers.getContract<Issuer>("Issuer");
    const issuerIssuer = issuer.connect(issuerMemberSigner);

    const marketplace = await ethers.getContract<Marketplace>("Marketplace");
    const issuerMarketplace = marketplace.connect(issuerMemberSigner);

    await Promise.all(params.gaslessAccounts.map(async (gaslessAccount) => {
      await (await issuerIssuer.addMember(gaslessAccount)).wait();
      await (await issuerMarketplace.addMember(gaslessAccount)).wait();
    }));

    console.log("Adding the trusted forwarder...", params.trustedForwarderAddress);

    await (await issuerMarketplace.setTrustedForwarder(params.trustedForwarderAddress)).wait();
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

// TODO: Tidy this up... any is too slack.
const abiFromFactory = (factory: any): [string] => {
  return new ethers.utils.Interface(factory.abi)
    .format(ethers.utils.FormatTypes.simple);
};

export { PAYMASTER_FACETS, deployPaymaster };