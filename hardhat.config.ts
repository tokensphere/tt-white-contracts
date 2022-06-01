import 'dotenv/config';
import * as dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import '@typechain/hardhat';
// import '@nomiclabs/hardhat-ethers';
// import '@nomiclabs/hardhat-waffle';
import 'solidity-coverage';
import 'hardhat-gas-reporter';

// Loads `.env` file into `process.env`.
dotenv.config();

// Import all of our tasks here!
import './src/tasks/accounts';
import './src/tasks/libraries';
import './src/tasks/spc';
import './src/tasks/fast';
import './src/tasks/bootstrap';

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
    spcOwner: {
      hardhat: 1,
      localhost: 1
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
