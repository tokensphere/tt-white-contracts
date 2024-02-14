import { type DeploymentsExtension } from 'hardhat-deploy/types'

import { GsnDomainSeparatorType, GsnRequestType } from '@opengsn/common'
import { defaultGsnConfig } from '@opengsn/provider'

import { type DeployOptions, type DeployResult } from 'hardhat-deploy/dist/types'
import chalk from 'chalk'
import { formatEther } from 'ethers'
import { type HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'

import {
  applyDeploymentConfig,
  fatal, getDeploymentEnv,
  printRelayInfo,
} from '../src/deployUtils'

const FORWARDER_FILE = '@opengsn/contracts/src/forwarder/Forwarder.sol:Forwarder'
const PENALIZER_FILE = '@opengsn/contracts/src/Penalizer.sol:Penalizer'
const STAKE_MANAGER_FILE = '@opengsn/contracts/src/StakeManager.sol:StakeManager'
const RELAY_REGISTRAR_FILE = '@opengsn/contracts/src/utils/RelayRegistrar.sol:RelayRegistrar'
const RELAY_HUB_FILE = '@opengsn/contracts/src/RelayHub.sol:RelayHub'

// helper: nicer logging view fo deployed contracts
async function deploy(deployments: DeploymentsExtension, name: string, options: DeployOptions): Promise<DeployResult> {
  console.log('Deploying: ', name)
  const res = await deployments.deploy(name, { ...options, log: true })
  console.log(name, res.address, res.newlyDeployed ? chalk.yellow('newlyDeployed') : chalk.gray('existing'))
  return res
}

export default async function deploymentFunc(hre: HardhatRuntimeEnvironment): Promise<void> {
  const { env, deployments, deployer } = await getDeploymentEnv(hre)

  const balance = await ethers.provider.getBalance(deployer)
  console.log('deployer=', deployer, 'balance=', formatEther(balance.toString()))

  if (env.deploymentConfiguration == null || Object.keys(env.deploymentConfiguration.minimumStakePerToken).length === 0) {
    fatal('must have at least one entry in minimumStakePerToken')
  }

  let stakingTokenAddress = Object.keys(env.deploymentConfiguration.minimumStakePerToken ?? {})[0]
  if (stakingTokenAddress == null) {
    fatal('must specify token address in minimumStakePerToken (or "test" to deploy TestWrappedNativeToken')
  }

  if (stakingTokenAddress === 'test') {
    const TestWrappedNativeToken = await deploy(deployments, 'TestWrappedNativeToken', {
      from: deployer
    })
    stakingTokenAddress = TestWrappedNativeToken.address
  }

  const deployedForwarder = await deploy(deployments, 'Forwarder', {
    contract: FORWARDER_FILE,
    from: deployer,
    deterministicDeployment: true
  })

  if (deployedForwarder.newlyDeployed) {
    const options = { from: deployer, log: true }
    await deployments.execute('Forwarder', options, 'registerRequestType', GsnRequestType.typeName, GsnRequestType.typeSuffix)
    await deployments.execute('Forwarder', options, 'registerDomainSeparator', defaultGsnConfig.domainSeparatorName, GsnDomainSeparatorType.version)
  }

  const penalizer = await deploy(deployments, 'Penalizer', {
    from: deployer,
    contract: PENALIZER_FILE,
    args: [
      env.penalizerConfiguration.penalizeBlockDelay,
      env.penalizerConfiguration.penalizeBlockDelay
    ]
  })

  const stakeManager = await deploy(deployments, 'StakeManager', {
    from: deployer,
    contract: STAKE_MANAGER_FILE,
    args: [env.maxUnstakeDelay, env.abandonmentDelay, env.escheatmentDelay, env.stakeBurnAddress, env.relayHubConfiguration.devAddress]
  })

  const relayRegistrar = await deploy(deployments, 'RelayRegistrar', {
    from: deployer,
    contract: RELAY_REGISTRAR_FILE,
    args: [env.deploymentConfiguration.registrationMaxAge]
  })

  const hubConfig = env.relayHubConfiguration
  let relayHub: DeployResult
  let hubContractName: string
  let hubContractFile: string

  hubContractName = 'RelayHub'
  hubContractFile = RELAY_HUB_FILE
  relayHub = await deploy(deployments, hubContractName, {
    from: deployer,
    contract: hubContractFile,
    args: [
      stakeManager.address,
      penalizer.address,
      ethers.ZeroAddress, // batch gateway
      relayRegistrar.address,
      hubConfig
    ]
  })

  await applyDeploymentConfig(hre)

  await printRelayInfo(hre, env.deploymentConfiguration?.isArbitrum)
}
