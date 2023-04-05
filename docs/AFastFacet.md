# Solidity API

## AFastFacet

This abstract contract encapsulates modifiers allowing inheriting facets to guard against
certain permissions.

### _isMarketplaceMember

```solidity
function _isMarketplaceMember(address who) internal view returns (bool)
```

Internal ACL functions.

### _isMarketplaceActiveMember

```solidity
function _isMarketplaceActiveMember(address who) internal view returns (bool)
```

### _isIssuerMember

```solidity
function _isIssuerMember(address who) internal view returns (bool)
```

### _isGovernor

```solidity
function _isGovernor(address who) internal view returns (bool)
```

### _isMember

```solidity
function _isMember(address who) internal view returns (bool)
```

### _automatonHasPrivilege

```solidity
function _automatonHasPrivilege(address who, uint32 flag) internal view returns (bool)
```

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
modifier onlyMarketplaceMember(address who)
```

Ensures that the given address is a member of the Marketplace.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | The address to check. |

### onlyMarketplaceActiveMember

```solidity
modifier onlyMarketplaceActiveMember(address who)
```

Ensures a who is an active member of the Marketplace.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | The address to check. |

### onlyIssuerMember

```solidity
modifier onlyIssuerMember()
```

Ensures that the message sender is a member of the Issuer.

### onlyGovernor

```solidity
modifier onlyGovernor(address who)
```

Ensures that the given address is a governor of the FAST.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | The address to check. |

### onlyMember

```solidity
modifier onlyMember(address who)
```

Ensures that the given address is a member of the FAST.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | The address to check. |

### differentAddresses

```solidity
modifier differentAddresses(address a, address b)
```

Ensures address `a` and `b` are different.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| a | address | Address a |
| b | address | Address b |

