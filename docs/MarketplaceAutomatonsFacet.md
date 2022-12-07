# Solidity API

## MarketplaceAutomatonsFacet

The Marketplace Automatons facet is in charge of keeping track of automaton accounts.

### isAutomaton

```solidity
function isAutomaton(address candidate) external view returns (bool)
```

Queries whether a given address is an automaton for this Marketplace or not.

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
function automatonPrivileges(address automaton) external view returns (uint256)
```

Returns the privileges for a given automaton address, or zero if no privileges exist.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| automaton | address | is the address to test. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An `uint256` bitfield. |

### automatonCount

```solidity
function automatonCount() external view returns (uint256)
```

Counts the numbers of automatons present in this Marketplace.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of automatons in this marketplace. |

### paginateAutomatons

```solidity
function paginateAutomatons(uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Paginates the automatons of this Marketplace based on a starting cursor and a number of records per page.

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

### automatonPrivilegesStruct

```solidity
function automatonPrivilegesStruct(address automaton) external view returns (struct LibMarketplaceAutomatons.Privileges)
```

Returns the privileges given to an automaton address in struct form.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| automaton | address | is the address to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct LibMarketplaceAutomatons.Privileges | A `LibMarketplaceAutomatons.Privileges` struct populated with privileges bits. |

### setAutomatonPrivileges

```solidity
function setAutomatonPrivileges(address candidate, uint256 privileges) external
```

Sets privileges for a given automaton address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the automaton address to which the privileges should be assigned. |
| privileges | uint256 | is a bitfield of privileges to apply. |

### removeAutomaton

```solidity
function removeAutomaton(address candidate) external
```

Removes an automaton completely.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the automaton to remove. |

