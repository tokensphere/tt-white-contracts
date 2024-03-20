/**
 * @type import('hardhat/config').HardhatUserConfig
 */
import '@nomiclabs/hardhat-web3'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-etherscan'

import fs from 'fs'
import { type HardhatUserConfig } from 'hardhat/config'
import path from 'path'
import chalk from 'chalk'
import './src/exportTask'

const CONTRACTS_LINK = 'contracts-link'

if (!fs.existsSync(path.join(CONTRACTS_LINK, 'RelayHub.sol'))) {
  console.log('== creating symlink', chalk.yellow(CONTRACTS_LINK), 'for contracts')
  fs.symlinkSync('../contracts/solpp', CONTRACTS_LINK)
}
if (!fs.existsSync(path.join(CONTRACTS_LINK, 'paymasters/SingleRecipientPaymaster.sol'))) {
  console.log('== creating symlink', chalk.yellow(CONTRACTS_LINK + '/paymasters'), 'for contracts')
  fs.symlinkSync('../../paymasters/contracts', CONTRACTS_LINK + '/paymasters')
}

export const accounts = (networkName: string): string[] => {
  try {
    return JSON.parse(
      fs.readFileSync(`./conf/keys.${networkName}.json`, "utf8")
    );
  } catch (_error) {
    console.warn(`Cannot read keys file at conf/keys.${networkName}.json .`);
    return [];
  }
};

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
    dev: {
      url: 'http://geth:8546',
      chainId: 18021980,
      saveDeployments: true,
      live: true,
      accounts: accounts("dev")
    },
    // Polygon Amoy
    amoy: {
      url: "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      saveDeployments: true,
      live: true,
      accounts: accounts("amoy")
    },
  }
}

module.exports = config
