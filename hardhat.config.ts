import 'dotenv/config';
import * as dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import '@typechain/hardhat';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import 'hardhat-diamond-abi';
import 'solidity-coverage';
import 'hardhat-gas-reporter';

// Loads `.env` file into `process.env`.
dotenv.config();

// Import all of our tasks here!
import './tasks/accounts';
import './tasks/spc';
import './tasks/fast';
import './tasks/bootstrap';

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
  diamondAbi: {
    name: 'Fast',
    include: ['FastInitFacet', 'FastFacet', 'FastAccessFacet', 'FastTokenFacet', 'FastHistoryFacet']
  },
  networks: {
    hardhat: {
      live: false,
      saveDeployments: true,
      tags: ['test', 'local']
    },
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ['local'],
    }
  },
  namedAccounts: {
    deployer: {
      hardhat: 0,
      localhost: 0
    },
    spcMember: {
      hardhat: 1,
      localhost: 1
    },
    fastGovernor: {
      hardhat: 2,
      localhost: 2
    }
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    gasPrice: 21,
    currency: 'EUR'
  }
};
export default config;
