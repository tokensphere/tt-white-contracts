# Solidity API

## MarketplaceAutomatonsFacet

The Marketplace Automatons facet is in charge of keeping track of automaton accounts.

### PRIVILEGE_MANAGE_MEMBERS

```solidity
uint32 PRIVILEGE_MANAGE_MEMBERS
```

Constants etc.

### PRIVILEGE_ACTIVATE_MEMBERS

```solidity
uint32 PRIVILEGE_ACTIVATE_MEMBERS
```

### isAutomatonsManager

```solidity
function isAutomatonsManager(address who) internal view returns (bool)
```

Automatons management.

