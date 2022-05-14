import * as dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import '@openzeppelin/hardhat-upgrades';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

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
    ropsten: {
      url: process.env.ROPSTEN_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    gasPrice: 21,
    currency: 'EUR'
  }
};
export default config;
