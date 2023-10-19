import { HardhatUserConfig } from "hardhat/config";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "hardhat-diamond-abi";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "solidity-docgen";
import { DEPLOYER_FACTORY_COMMON, accounts, abiFilter } from "./src/utils";
import { ISSUER_FACETS } from "./tasks/issuer";
import { MARKETPLACE_FACETS } from "./tasks/marketplace";
import { FAST_FACETS } from "./tasks/fast";
import { PAYMASTER_FACETS } from "./tasks/paymaster";

// Import all of our tasks here!
import "./tasks/accounts";
import "./tasks/issuer";
import "./tasks/marketplace";
import "./tasks/paymaster";
import "./tasks/fast";
import "./tasks/upgrades";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.10",
    settings: {
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
      optimizer: {
        enabled: true,
        runs: 1000000,
      },
    },
  },
  diamondAbi: [
    {
      name: "Issuer",
      filter: abiFilter([
        // Event types.
        ["Facet$", "EthDrained(address,uint256)"],
        ["Facet$", "EthReceived(address,uint256)"],
        ["Facet$", "FastRegistered(address)"],
        ["Facet$", "FastUnregistered(address)"],
        ["Facet$", "FastGroupChanged(address,string,string)"],
        ["Facet$", "GovernorshipAdded(address,address)"],
        ["Facet$", "GovernorshipRemoved(address,address)"],
        // Error types.
        ["Facet$", "RequiresIssuerMembership(address)"],
        ["Facet$", "RequiresFastContractCaller()"],
      ]),
      include: [
        "IERC173",
        "IDiamondCut",
        "IDiamondLoupe",
        "IIssuerEvents",
        ...ISSUER_FACETS,
      ],
    },
    {
      name: "Marketplace",
      filter: abiFilter([
        // Event types.
        ["Facet$", "MemberActivated(address)"],
        ["Facet$", "MemberDeactivated(address)"],
        ["Facet$", "FastDeploymentRequested(uint256)"],
        // Error types.
        ["Facet$", "InsufficientFunds(uint256)"],
        ["Facet$", "OutOfBounds()"],
        ["Facet$", "Overfunded(uint256)"],
        ["Facet$", "RequiresFastContractCaller()"],
        ["Facet$", "RequiresIssuerMembership(address)"],
        ["Facet$", "RequiresMarketplaceMembership(address)"],
      ]),
      include: [
        "IERC173",
        "IDiamondCut",
        "IDiamondLoupe",
        "IMarketplaceEvents",
        ...MARKETPLACE_FACETS,
      ],
    },
    {
      name: "Fast",
      filter: abiFilter([
        // Event types.
        ["Facet$", "EthDrained(address,uint256)"],
        ["Facet$", "EthReceived(address,uint256)"],
        ["Facet$", "Minted(uint256,string,address)"],
        ["Facet$", "Burnt(uint256,string,address)"],
        ["Facet$", "FastTransfer(address,address,address,uint256,string)"],
        ["Facet$", "Transfer(address,address,uint256)"],
        ["Facet$", "Approval(address,address,uint256)"],
        ["Facet$", "Disapproval(address,address,uint256)"],
        [
          "Facet$",
          "DetailsChanged(bool,uint32,uint256,uint256,uint256,uint256)",
        ],
        ["Facet$", "DistributionDeployed(address)"],
        ["Facet$", "DistributionRemoved(address)"],
        ["Facet$", "CrowdfundDeployed(address)"],
        ["Facet$", "CrowdfundRemoved(address)"],
        ["Facet$", "CrowdfundDefaultBasisPointFeeSet(uint32)"],
        // Error types.
        ["Facet$", "InternalMethod()"],
        ["Facet$", "RequiresIssuerMembership(address)"],
        ["Facet$", "RequiresMarketplaceMembership(address)"],
        ["Facet$", "RequiresFastMembership(address)"],
        ["Facet$", "RequiresFastGovernorship(address)"],
        ["Facet$", "UnsupportedOperation()"],
        ["Facet$", "InvalidCrowdfundBasisPointFee(uint32)"],
      ]),
      include: [
        "IERC173",
        "IDiamondCut",
        "IDiamondLoupe",
        "IFastEvents",
        ...FAST_FACETS,
      ],
    },
    {
      name: "Paymaster",
      filter: abiFilter([
        // Event types.
        // ...
        // Error types.
        ["Facet$", "InvalidApprovalDataLength()"],
        ["Facet$", "InvalidPaymasterDataLength()"],
      ]),
      include: [
        "IERC173",
        "IDiamondCut",
        "IDiamondLoupe",
        ...PAYMASTER_FACETS,
      ],
    },
  ],
  networks: {
    // Built-in for tests etc.
    hardhat: { saveDeployments: false },
    localhost: { saveDeployments: false },
    // Typically a Geth local dev net.
    dev: {
      live: true,
      saveDeployments: true,
      url: "http://localhost:8546",
      chainId: 18021980,
      accounts: accounts("dev"),
    },
    // Polygon stuff.
    mumbai: {
      live: true,
      saveDeployments: true,
      url: "https://rpc-mumbai.polygon.technology",
      chainId: 80001,
      accounts: accounts("mumbai"),
    },
    amoy: {
      live: true,
      saveDeployments: true,
      url: "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: accounts("amoy"),
    },
    polygon: {
      live: true,
      saveDeployments: true,
      url: "https://polygon-rpc.com/",
      chainId: 137,
      accounts: accounts("polygon"),
    },
  },
  namedAccounts: {
    // The one in charge of all ops. It will also be the owner of the deployed proxies and contracts.
    deployer: {
      default: 0,
    },
    // The account who will be the first member of the ISSUER contract.
    issuerMember: {
      default: 1,
    },
    // Used to hold genesis Eth in our live environments.
    storage: {
      default: 2,
    },
    // Used exclusively in dev environments when deploying test FAST contracts.
    fastGovernor: {
      default: 3,
    },
    automaton: { default: 4 },
    user1: { default: 5 },
    user2: { default: 6 },
    user3: { default: 7 },
    user4: { default: 8 },
    user5: { default: 9 },
    user6: { default: 10 },
    user7: { default: 11 },
    user8: { default: 12 },
    user9: { default: 13 },
  },
  // Our deterministic deployment parameters were generated using https://github.com/safe-global/safe-singleton-factory.
  // These shouldn't need to change - they are self-contained, and allow to deploy everything needed
  // for determinist deployments on our three environments.
  deterministicDeployment: {
    // Hardhat / Localhost.
    31337: {
      ...DEPLOYER_FACTORY_COMMON,
      signedTx:
        "0xf8a78085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf382f4f5a03381292b6ba77ee1f88e5418750ba737f5e94d8df24b67c4eab84b6a96801c70a03409d040cfc82946e15e361c5142cc7b811c8ee3d9b94460ba3ef45d0e293dde",
    },
    // Local Geth POA chain.
    18021980: {
      ...DEPLOYER_FACTORY_COMMON,
      signedTx:
        "0xf8a98085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3840225fcdba01590b43af70aef60a9342a33eaf1536b07df9ba36e96f0e5102485b4f23f7720a01e6266145487736a1809cf67cbc0a86d9eee3438cc97e0bd523694f3f3e9e1cb",
    },
    // Polygon Testnet - Mumbai.
    80001: {
      ...DEPLOYER_FACTORY_COMMON,
      signedTx:
        "0xf8a88085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf383027125a05f9ad6b5fd17d50ec5b92745a600a89fe389f8d4bae2f06189efe0543374acb2a0570b22388a260bc0d2ace93767114ab9a4f7776177778b2293c1233118c725b5",
    },
    // Polygon Testnet - Amoy.
    80002: {
      ...DEPLOYER_FACTORY_COMMON,
      signedTx:
        "0xf8a88085746a52880f830174a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf383027128a0983a0a2de9444f60b6405a227cce730f6d1025f02ff2d37c638e976389f8a073a07846164338796cbf55c45d80f7b328ff55f495d0264574a7cb876673808161bc",
    },
    // Polygon Mainnet.
    137: {
      ...DEPLOYER_FACTORY_COMMON,
      signedTx:
        "0xf8a78085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3820135a005875581598a4bb6ff0dffadc18a9ef60b5829b031d5f744834da3ac508e744ca05f114c384908df349ba3200e308ee8862872dd42ce7252118174b5844fbcc661",
    },
  },
  typechain: {
    externalArtifacts: [
      "artifacts/hardhat-diamond-abi/HardhatDiamondABI.sol/*.json",
    ],
    outDir: "typechain",
    target: "ethers-v5",
  },
  docgen: { pages: "items" },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
  },
};
export default config;
