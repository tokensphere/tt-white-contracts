/**
 * @type import('hardhat/config').HardhatUserConfig
 */
import '@nomiclabs/hardhat-web3'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-etherscan'

import fs from 'fs'
import { type HardhatUserConfig } from 'hardhat/config'
import { type NetworkUserConfig } from 'hardhat/src/types/config'
import path from 'path'
import chalk from 'chalk'
import './src/exportTask'

function getNetwork(url: string): NetworkUserConfig {
  return {
    url,
    accounts: [
      /* user1 - exposed local dev account */ "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"
    ]
  }
}

const CONTRACTS_LINK = 'contracts-link'

if (!fs.existsSync(path.join(CONTRACTS_LINK, 'RelayHub.sol'))) {
  console.log('== creating symlink', chalk.yellow(CONTRACTS_LINK), 'for contracts')
  fs.symlinkSync('../contracts/solpp', CONTRACTS_LINK)
}
if (!fs.existsSync(path.join(CONTRACTS_LINK, 'paymasters/SingleRecipientPaymaster.sol'))) {
  console.log('== creating symlink', chalk.yellow(CONTRACTS_LINK + '/paymasters'), 'for contracts')
  fs.symlinkSync('../../paymasters/contracts', CONTRACTS_LINK + '/paymasters')
}

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.7',
    settings: {
      optimizer: {
        enabled: true
      }
    }
  },
  paths: {
    deployments: 'deployments/networks',
    sources: CONTRACTS_LINK // can't use "../contracts/src" directly.
  },
  networks: {
    // TS updates
    // Local geth node
    dev: getNetwork('http://geth:8546'),
  }
}

module.exports = config
