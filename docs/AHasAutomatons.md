# Solidity API

## AHasAutomatons

The Fast Automatons facet is in charge of keeping track of automaton accounts.

### RequiresAutomatonsManager

```solidity
error RequiresAutomatonsManager(address who)
```

Errors.

### AutomatonPrivilegesSet

```solidity
event AutomatonPrivilegesSet(address automaton, uint32 privileges)
```

Emited when an automaton is added or changed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| automaton | address | is the address of the automaton. |
| privileges | uint32 | is the new bitfield assigned to this automaton. |

### AutomatonRemoved

```solidity
event AutomatonRemoved(address automaton)
```

Emited when an automaton is removed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| automaton | address | is the address of the removed automaton. |

### isAutomatonsManager

```solidity
function isAutomatonsManager(address who) internal view virtual returns (bool)
```

### onAutomatonAdded

```solidity
function onAutomatonAdded(address member) internal virtual
```

### onAutomatonRemoved

```solidity
function onAutomatonRemoved(address member) internal virtual
```

### isAutomaton

```solidity
function isAutomaton(address candidate) external view returns (bool)
```

Queries whether a given address is an automaton for this Fast or not.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the address to test. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `boolean` flag. |

### automatonPrivileges

```solidity
function automatonPrivileges(address automaton) external view returns (uint32)
```

Returns the privileges for a given automaton address, or zero if no privileges exist.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| automaton | address | is the address to test. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint32 | An `uint256` bitfield. |

### automatonCount

```solidity
function automatonCount() external view returns (uint256)
```

Counts the numbers of automatons present in this Fast.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of automatons in this marketplace. |

### paginateAutomatons

```solidity
function paginateAutomatons(uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Paginates the automatons of this Fast based on a starting cursor and a number of records per page.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| cursor | uint256 | is the index at which to start. |
| perPage | uint256 | is how many records should be returned at most. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | A `address[]` list of values at most `perPage` big. |
| [1] | uint256 | A `uint256` index to the next page. |

### setAutomatonPrivileges

```solidity
function setAutomatonPrivileges(address candidate, uint32 privileges) external
```

Sets privileges for a given automaton address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the automaton address to which the privileges should be assigned. |
| privileges | uint32 | is a bitfield of privileges to apply. |

### removeAutomaton

```solidity
function removeAutomaton(address candidate) external
```

Removes an automaton completely.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the automaton to remove. |

### onlyAutomatonManager

```solidity
modifier onlyAutomatonManager(address who)
```

Modifiers.

