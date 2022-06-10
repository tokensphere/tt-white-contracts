# TT White Contracts

This repository contains the Ethereum Smart Contracts that are used for our Tokenization as a Service (TSaaS) platform.
This project uses Hardhat to allow for streamlined development and testing, as well as some helpful tasks (see `./src/tasks`).

Note that contracts deployed using migration scripts (See `deploy/`) and tasks (See `tasks/fast.ts` for example) are using deterministic salts.
This means that regardless of the network you're using (local, staging, production etc), the address of the deployed contracts should remain the same.

## Bootstrapping a Functional System Locally

For development systems, we use local signers (Eg `ethers.getSigners()`). In the following paragraphs, you can assume that:

- `zero_address` is `0x0000000000000000000000000000000000000000`.
- `deployer` is the very first signer from the signers list.
- `spcMember` is the second signer from the signers list.
- `governor` is the third signer from the signers list.
- `member` is the fourth signer from the signers list.
- `random` is a random - non-signer at address `0xF7e5800E52318834E8689c37dCCCD2230427a905`.

When starting a local development node (`yarn hardhat node`), you'll notice that both the SPC and Exchange contracts are being deployed automatically.

You then probably might want to jump directly to the `fast-deploy` task of this document to get started.

## Account Tasks (See `src/tasks/accounts.ts`)

To provision an account with ETH, you can run:

```shell
yarn hardhat faucet 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 \
              --network localhost
```

Or if you're in a hurry and you would like all available signers to obtain an outrageous amount
of ETH, you can run:

```shell
yarn hardhat make-us-rich \
              --network localhost
```

## Top-Level Tasks (See `src/tasks/spc.ts`)

You can then subsequently deploy the main SPC and Exchange by running:

```shell
yarn hardhat spc-deploy \
              --network localhost \
              --member 0x70997970c51812dc3a010c7d01b50e0d17dc79c8
```

> Note that you won't need to run this particular task if you're using a local development node,
> as the migration scripts in `deploy/` are ran automatically upon starting it.

## FAST Token Tasks (See `src/tasks/fast.ts`)

Then you can start deploying FAST:

```shell
yarn hardhat fast-deploy \
              --network localhost \
              --governor 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc \
              --name "Some Awesome FAST Stuff" \
              --symbol "SAF" \
              --decimals 18 \
              --has-fixed-supply false \
              --is-semi-public true \
              --mint 1000000 \
              --tx-credits 1000000
```

This task automatically deploys a full FAST diamond including its initialization facet. It then calls the
`FastInitFacet.initialize/0` function, and lastly performs a diamond cut to remove the initialization facet.

Once at least one FAST is deployed, take note of its symbol. There are more tasks that you can run
over a particular FAST.

For example, to mint new tokens:

```shell
yarn hardhat fast-mint SAF \
              --network localhost \
              --amount 1000000 \
              --ref "Much tokens, very wow, such bling."
```

At this point, it's important to add transfer credits to the FAST, so that transfers can freely be executed.

```shell
yarn hardhat fast-add-transfer-credits SAF 5000000 \
              --network localhost
```

To obtain the balance of an account over a particular FAST:

```shell
yarn hardhat fast-balance SAF \
              --network localhost \
              --account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc
```

If you would like to query the minted (unallocated) tokens, you can instead query address zero:

```shell
yarn hardhat fast-balance SAF \
              --network localhost \
              --account 0x0000000000000000000000000000000000000000
```

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
