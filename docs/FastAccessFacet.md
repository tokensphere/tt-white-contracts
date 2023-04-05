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

### onGovernorAdded

```solidity
function onGovernorAdded(address governor) internal
```

### onGovernorRemoved

```solidity
function onGovernorRemoved(address governor) internal
```

### isMembersManager

```solidity
function isMembersManager(address who) internal view returns (bool)
```

AHasMembers implementation.

### isValidMember

```solidity
function isValidMember(address who) internal view returns (bool)
```

### onMemberAdded

```solidity
function onMemberAdded(address member) internal
```

### onMemberRemoved

```solidity
function onMemberRemoved(address member) internal
```

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

