import { HardhatUserConfig } from 'hardhat/config';
import '@typechain/hardhat';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import 'hardhat-diamond-abi';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import { DEPLOYER_FACTORY_COMMON, accounts, nodeUrl } from './src/utils';
import { SPC_FACETS } from './tasks/spc';
import { EXCHANGE_FACETS } from './tasks/exchange';
import { FAST_FACETS } from './tasks/fast';

// Import all of our tasks here!
import './tasks/accounts';
import './tasks/spc';
import './tasks/exchange';
import './tasks/fast';


const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.4',
    settings: {
      outputSelection: {
        '*': {
          '*': ['storageLayout']
        }
      }
    }
  },
  diamondAbi: [{
    name: 'Spc',
    include: [
      'IERC173',
      'IERC165',
      'IDiamondCut',
      'IDiamondLoupe',
      ...SPC_FACETS
    ]
  }, {
    name: 'Exchange',
    include: [
      'IERC173',
      'IERC165',
      'IDiamondCut',
      'IDiamondLoupe',
      ...EXCHANGE_FACETS
    ]
  }, {
    name: 'Fast',
    include: [
      'IERC173',
      'IDiamondCut',
      'IDiamondLoupe',
      ...FAST_FACETS
    ]
  }],
  networks: {
    hardhat: {
      saveDeployments: false
    },
    dev: {
      live: true,
      saveDeployments: true,
      url: nodeUrl('dev'),
      chainId: 18021980,
      accounts: accounts('dev')
    },
    staging: {
      live: true,
      saveDeployments: true,
      url: nodeUrl('staging'),
      chainId: 18021981,
      accounts: accounts('staging')
    },
    production: {
      live: true,
      saveDeployments: true,
      url: nodeUrl('production'),
      chainId: 18021982,
      accounts: accounts('production')
    }
  },
  namedAccounts: {
    // TODO: WE NEED DEPLOYER TO BE THE SAME ACROSS ALL LIVE ENVIRONMENTS.
    // The one in charge of all ops. It will also be the owner of the deployed proxies and contracts.
    deployer: {
      default: 0,
      staging: '0x717634cfe06FFAB2CEAA7fcf1b9019813f4B25FE',
      production: '0x717634cfe06FFAB2CEAA7fcf1b9019813f4B25FE'
    },
    // The account who will be the first member of the SPC contract.
    spcMember: {
      default: 1,
      staging: '0xd786f085c53E1674afFcEe9252Bb3E7044698267',
      production: '0xb1004872B989ec8894F8Dd07da85437Dff9ddb37',
    },
    // Used to hold genesis Eth in our live environments.
    storage: {
      default: 2,
      staging: '0x459afD5DC396d24Fa4843a42276e5260c73A62f1',
      production: '0x459afD5DC396d24Fa4843a42276e5260c73A62f1',
    },
    // Used exclusively in dev environments when deploying test FAST contracts.
    fastGovernor: { default: 3 },
    user1: { default: 4 },
    user2: { default: 5 },
    user3: { default: 6 },
    user4: { default: 7 },
    user5: { default: 8 },
    user6: { default: 9 },
    user7: { default: 10 },
    user8: { default: 11 },
    user9: { default: 12 },
    user10: { default: 13 }
  },
  // Our deterministic deployment parameters were generated using https://github.com/safe-global/safe-singleton-factory.
  // These shouldn't need to change - they are self-contained, and allow to deploy everything needed
  // for determinist deployments on our three environments.
  deterministicDeployment: {
    // Hardhat / Localhost.
    31337: {
      ...DEPLOYER_FACTORY_COMMON,
      signedTx: '0xf8a78085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf382f4f5a03381292b6ba77ee1f88e5418750ba737f5e94d8df24b67c4eab84b6a96801c70a03409d040cfc82946e15e361c5142cc7b811c8ee3d9b94460ba3ef45d0e293dde',
    },
    // Local Geth POA chain.
    18021980: {
      ...DEPLOYER_FACTORY_COMMON,
      signedTx: '0xf8a98085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3840225fcdba01590b43af70aef60a9342a33eaf1536b07df9ba36e96f0e5102485b4f23f7720a01e6266145487736a1809cf67cbc0a86d9eee3438cc97e0bd523694f3f3e9e1cb',
    },
    // Staging.
    18021981: {
      ...DEPLOYER_FACTORY_COMMON,
      signedTx: '0xf8a98085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3840225fcdea06ad52d72e9acaacd578c2c0582df2f9793dfba35f20bf7a36e5c3ff36b81dba5a07f4012aa24648095dc422bb1aff8918cad962c367c1ab4643f04dff97fdee941',
    },
    // Production.
    18021982: {
      ...DEPLOYER_FACTORY_COMMON,
      signedTx: '0xf8a98085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3840225fcdfa008e1c44962bf042ecfc8957cbe4becaef17ef447c04b7307fefdc88f5deff596a0549894bfc3037be469ad6784c988110fb8ae8d3f8a5258d1180fd965890b7267',
    }
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined
  }
};
export default config;
