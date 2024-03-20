module.exports = {
  '18021980': {
    environmentsKey: 'ethereumMainnet',
    relayHubConfiguration: {
      // User 1.
      devAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
      devFee: 10
    },
    deploymentConfiguration: {
      registrationMaxAge: 15552000,
      paymasterDeposit: '0.1',
      isArbitrum: false,
      deployTestPaymaster: false,
      deploySingleRecipientPaymaster: false,
      // Set the staking token to a small number of DDD tokens.
      // This is tied into our dev setup.
      minimumStakePerToken: { '0x3E8174689882c629de7478B4a0336266B6560C6D': '0.00000000000005' }
    }
  },
  // Polygon - Amoy.
  '80002': {
    environmentsKey: 'ethereumMainnet',
    relayHubConfiguration: {
      // Deployer.
      devAddress: '0x61B1E290d2F465d6667336d4934941aa2517AfA2',
      devFee: 10
    },
    deploymentConfiguration: {
      registrationMaxAge: 15552000,
      paymasterDeposit: '0.1',
      isArbitrum: false,
      deployTestPaymaster: false,
      deploySingleRecipientPaymaster: false,
      // Set the staking token to a small number of X tokens.
      minimumStakePerToken: { 'test': '0.00000000000005' }
    }
  }
}