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

### isGovernor

```solidity
function isGovernor(address candidate) external view returns (bool)
```

See `IHasGovernors`.

### governorCount

```solidity
function governorCount() external view returns (uint256)
```

See `IHasGovernors`.

### paginateGovernors

```solidity
function paginateGovernors(uint256 index, uint256 perPage) external view returns (address[], uint256)
```

See `IHasGovernors`.

### addGovernor

```solidity
function addGovernor(address payable governor) external
```

See `IHasGovernors`.

### removeGovernor

```solidity
function removeGovernor(address governor) external
```

See `IHasGovernors`.

### isMember

```solidity
function isMember(address candidate) external view returns (bool)
```

See `IHasMembers`.

### memberCount

```solidity
function memberCount() external view returns (uint256)
```

See `IHasMembers`.

### paginateMembers

```solidity
function paginateMembers(uint256 index, uint256 perPage) external view returns (address[], uint256)
```

See `IHasMembers`.

### addMember

```solidity
function addMember(address payable member) external
```

See `IHasMembers`.

### removeMember

```solidity
function removeMember(address member) external
```

See `IHasMembers`.

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

