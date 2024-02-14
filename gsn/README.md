# OpenGSN v3 setup ⛽️

The `/gsn` folder within the tt-white-contracts repo contains:

- `deploy`
- `relay`

It also contains a `Dockerfile` and `compose.yml` file.

Read on for the description...

## Docker files

`Dockerfile` contains the minimal setup to pull and build the OpenGSN repo. More specifically it:

- Pulls all the deps
- Compiles the contracts
- Compiles the relay server typescript into the js file ready to run

`compose.yml` is the `docker compose` main file.

Running `docker compose up` will bring up **just** the relay server - see "Replay" section below.

Running `docker run gsn_deploy` will deploy the OpenGSN contracts - see "Deploy" section below.

## Deploy - dev only

`deploy/config` holds the config for the deployment of the OpenGSN contracts - specifically:
- `RelayHub`
- `StakeManager`
- `Forwarder`
- `Penalizer`
- `RelayRegistrar`

Note: This should only be needed on a local chain... we _should_ be using the deployed contracts that exist on chain already.

See:
- Mainnet network: https://docs.opengsn.org/networks/polygon/polygon.html
- Mumbai network: https://docs.opengsn.org/networks/polygon/mumbai.html

Files in `deploy/config`:

```
gsn/deploy
└── config
    ├── deploy.ts
    ├── deployment-config.ts
    └── hardhat.config.ts
```

- `deploy.ts` ported from OpenGSN's Hardhat deployment config... trimmed down a _lot_.
- `deployment-config.ts` - created to configure the deployment - see: https://docs.opengsn.org/contracts/custom-deployment.html#deployment-configuration
- `hardhat.config.ts` - ported from OpenGSN's version, added our user1 account and _just_ our local dev node.


## Relay

`relay` holds the relay server's config / data.

- `config/gsn-relay-config.json` - Holds some basic config, stake token, host addresses etc.


## Deployment

Only in development:

```
yarn hardhat dev-fund-manager-and-worker \
  --network dev \
  --relay-manager-address 0x3ca47ff6ce8fbf7713703c2ab24c0fbd954662ba \
  --relay-worker-address 0x283fb0603889c2fa087c5622bba275ad596842d7
```

On the Relay set the Relay owner - see the README.

In all environments:

```
yarn hardhat paymaster-stake-setup \
  --network dev \
  --amount 50000 \
  --stake-token-address 0x3E8174689882c629de7478B4a0336266B6560C6D \
  --relay-hub-address 0x8aBb8E62Bd73f4c73b2CE7a02631B2dC911Ab720 \
  --relay-manager-address 0x3ca47ff6ce8fbf7713703c2ab24c0fbd954662ba
```

Set the trusted Forwarder and Relay Hub for the network.

```
yarn hardhat paymaster-setup \
  --network dev \
  --trusted-forwarder-address 0x985999389f85E5eA4425ac7379b1F7D56e694785 \
  --relay-hub-address 0x8aBb8E62Bd73f4c73b2CE7a02631B2dC911Ab720
```

Fund the paymaster.

```
yarn hardhat paymaster-fund \
  --network dev \
  --amount 1000000000000000000
```