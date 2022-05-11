# TT White Contracts

This repository contains the Ethereum Smart Contracts that are used for our Tokenization as a Service (TSaaS) platform.
This project uses Hardhat to allow for streamlined development and testing, as well as some helpful tasks (see `./src/tasks`).

Most deploy tasks takes care of updating the `.openzeppelin/state-${NETWORK_ID}.json` file so that it is easier to track addresses of previously deployed contracts.

## Bootstrapping a Functional System

Simply run this command:

```shell
yarn hardhat \
  bootstrap \
    --network localhost \
    --spc-member 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 \
    --governor 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc \
    --name "Consilience Ventures Digital Share" \
    --symbol "CVDS" \
    --decimals 6 \
    --has-fixed-supply true \
    --mint 1000000
```

## Account Tasks (See `src/tasks/accounts.ts`)

To provision an account with ETH, you can run:

```shell
yarn hardhat \
  faucet 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 \
  --network localhost
```

## Library Tasks (See `src/tasks/libraries.ts`)

To deploy the necessary libraries, you can run:

```shell
yarn hardhat \
  lib-deploy \
    AddressSetLib \
    --network localhost
yarn hardhat \
  lib-deploy \
    PaginationLib \
    --network localhost
```

## SPC Tasks (See `src/tasks/spc.ts`)

You can then subsequently deploy the main SPC by running:

```shell
yarn hardhat \
  spc-deploy \
    --network localhost \
    --member 0x70997970c51812dc3a010c7d01b50e0d17dc79c8
```

## FAST Token Tasks (See `src/tasks/fast.ts`)

Then you can start deploying FAST:

```shell
yarn hardhat \
  fast-deploy \
    --spc 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 \
    --network localhost \
    --governor 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc \
    --name "Consilience Ventures Digital Share" \
    --symbol "CVDS"
```

This task will execute a more complex orchestration. The contracts deployed during this phase are:
- `FastRegistry`: which keeps track of all other contracts for a given fast.
- `FastAccess`: which keeps track of the FAST's ACLs.
- `FastHistory`: a dedicated transfer / minting history keeper.
- `FastToken`: the FAST's ERC20 token itself.

Once at least one FAST is deployed, take note of its address. There are more tasks that you can run
over a particular FAST.

For example, to mint new tokens:

```shell
yarn hardhat \
  fast-mint \
    0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0 \
    --network localhost \
    --amount 1000000 \
    --ref "Much tokens, very wow, such bling."
```

At this point, it's important to add transfer credits to the token contract, so that transfers
can freely be executed.

```shell
yarn hardhat \
  fast-add-transfer-credits \
    0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0 \
    --network localhost \
    --spc 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 \
    --credits 5000000
```

To obtain the balance of an account over a particular FAST:

```shell
yarn hardhat \
  fast-balance \
    0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0 \
    --network localhost \
    --account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc
```

If you would like to query the minted (unallocated) tokens, you can instead query address zero:

```shell
yarn hardhat \
  fast-balance \
    0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0 \
    --network localhost \
    --account 0x0000000000000000000000000000000000000000
```

## FAST Access Tasks

## FAST History Tasks

## Hardhat Cheat-Sheet

Here are a few useful commands:

```shell
# Displays some help.
yarn hardhat help
# Compiles the contracts and generates artifacts.
yarn hardhat compile
# Cleans the build environment.
yarn hardhat clean
# Runs the test suite.
yarn hardhat test
# Runs the test suite, and reports gas usage.
REPORT_GAS=true yarn hardhat test
# Starts a local blockchain node.
yarn hardhat node
# Reports coverage.
yarn hardhat coverage
```
