# Solidity API

## AMarketplaceFacet

This contract is a group of modifiers that can be used by any Marketplace facets to guard against
      certain permissions.

### _isIssuerMember

```solidity
function _isIssuerMember(address who) internal view returns (bool)
```

Internal ACL functions.

### onlyDeployer

```solidity
modifier onlyDeployer()
```

Ensures that a method can only be called by the singleton deployer contract factory.

### onlyIssuerMember

```solidity
modifier onlyIssuerMember()
```

Requires that the message sender is a member of the linked Issuer.

### onlyMember

```solidity
modifier onlyMember(address who)
```

Requires that the given address is a member of the marketplace.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | is the address to be checked. |

