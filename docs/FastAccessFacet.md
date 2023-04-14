# Solidity API

## FastAccessFacet

The FAST Access facet is the source of truth when it comes to
permissioning and ACLs within a given FAST.

### Flags

```solidity
struct Flags {
  bool isGovernor;
  bool isMember;
}
```

### isGovernorsManager

```solidity
function isGovernorsManager(address who) internal view returns (bool)
```

AHasGovernors implementation.

### isValidGovernor

```solidity
function isValidGovernor(address who) internal view returns (bool)
```

Checks whether the given address can be added as a governor or not.

_Must be implemented by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | is the address to test. |

### onGovernorAdded

```solidity
function onGovernorAdded(address governor) internal
```

This callback is called when a governor is added to the contract.

_May be overriden by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address which was added. |

### onGovernorRemoved

```solidity
function onGovernorRemoved(address governor) internal
```

This callback is called when a governor is removed to the contract.

_May be overriden by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address which was removed. |

### isMembersManager

```solidity
function isMembersManager(address who) internal view returns (bool)
```

AHasMembers implementation.

### isValidMember

```solidity
function isValidMember(address who) internal view returns (bool)
```

Checks whether the given address can be added as a member or not.

_Must be implemented by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | is the address to test. |

### onMemberAdded

```solidity
function onMemberAdded(address member) internal
```

This callback is called when a member is added to the contract.

_May be overriden by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address which was added. |

### onMemberRemoved

```solidity
function onMemberRemoved(address member) internal
```

This callback is called when a member is removed to the contract.

_May be overriden by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address which was removed. |

### flags

```solidity
function flags(address a) external view returns (struct FastAccessFacet.Flags)
```

Retrieves flags for a given address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| a | address | is the address to retrieve flags for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct FastAccessFacet.Flags | A `Flags` struct. |

