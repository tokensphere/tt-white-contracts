# Keys Configuration Tips

The `/conf` folder contains keys to be used during deployments and other console-based operations.

When Hardhat starts, the `accounts` global gets defined based on files named using the `keys.${network}.json` pattern (see `/src/utils.ts`) and are made available in the Hardhat environment.
For example, `getNamedAccounts` will return accounts defined in these files.
Because Hardhat relies on index-based account declaration, the key files **must** be declared in the following order:

- Deployer.
- Issuer.
- Storage.
- FAST Governor (Only used for test networks where a seed setup is deployed).

Note that the Deployer account should be the same across all chains where a deterministic deployment scheme is desired.