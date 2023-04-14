# Solidity API

## AIssuerFacet

This abstract contract encapsulates modifiers allowing inheriting facets to guard against
certain permissions.

### onlyDiamondFacet

```solidity
modifier onlyDiamondFacet()
```

Ensures that a method can only be called by another facet of the same diamond.

### onlyDiamondOwner

```solidity
modifier onlyDiamondOwner()
```

Ensures that a method can only be called by the owner of this diamond.

### onlyDeployer

```solidity
modifier onlyDeployer()
```

Ensures that a method can only be called by the singleton deployer contract factory.

### onlyMember

```solidity
modifier onlyMember(address who)
```

Ensures that the given address is a member of the FAST.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | The address to check. |

