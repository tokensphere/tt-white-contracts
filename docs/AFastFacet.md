# Solidity API

## AFastFacet

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

### onlyMarketplaceMember

```solidity
modifier onlyMarketplaceMember(address candidate)
```

Ensures that the given address is a member of the Marketplace.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | The address to check. |

### onlyMarketplaceActiveMember

```solidity
modifier onlyMarketplaceActiveMember(address candidate)
```

Ensures a candidate is an active member of the Marketplace.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | The address to check. |

### onlyIssuerMember

```solidity
modifier onlyIssuerMember()
```

Ensures that the message sender is a member of the Issuer.

### onlyGovernor

```solidity
modifier onlyGovernor(address candidate)
```

Ensures that the given address is a governor of the FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | The address to check. |

### onlyMember

```solidity
modifier onlyMember(address candidate)
```

Ensures that the given address is a member of the FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | The address to check. |

### differentAddresses

```solidity
modifier differentAddresses(address a, address b)
```

Ensures address `a` and `b` are different.

| Name | Type | Description |
| ---- | ---- | ----------- |
| a | address | Address a |
| b | address | Address b |

## AFastFacet

## AFastFacet

## AFastFacet

