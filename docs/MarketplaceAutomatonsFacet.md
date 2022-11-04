# Solidity API

## MarketplaceAutomatonsFacet

The Marketplace Access facet is in charge of keeping track of marketplace members.

### isAutomaton

```solidity
function isAutomaton(address candidate) external view returns (bool)
```

Queries whether a given address is a automaton or not.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `bool` equal to `true` when `candidate` is a automaton. |

### automatonPrivileges

```solidity
function automatonPrivileges(address automaton) external view returns (uint256)
```

Queries flags assigned to a given automaton account.

| Name | Type | Description |
| ---- | ---- | ----------- |
| automaton | address | is the address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | A `uint256` representing a binary combination of possible flags. |

### automatonCount

```solidity
function automatonCount() external view returns (uint256)
```

Queries the number of automatons.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An `uint256`. |

### paginateAutomatons

```solidity
function paginateAutomatons(uint256 index, uint256 perPage) external view returns (address[], uint256)
```

Queries pages of automatons based on a start index and a page size.

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | is the offset at which the pagination operation should start. |
| perPage | uint256 | is how many items should be returned. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page. |
| [1] | uint256 |  |

### automatonPrivilegesStruct

```solidity
function automatonPrivilegesStruct(address automaton) external view returns (struct LibMarketplaceAutomatons.Privileges)
```

### setAutomatonPrivileges

```solidity
function setAutomatonPrivileges(address candidate, uint256 privileges) external
```

Adds a automaton to the list of known automatons.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the address to be added. |
| privileges | uint256 |  |

### removeAutomaton

```solidity
function removeAutomaton(address candidate) external
```

## MarketplaceAutomatonsFacet

The Marketplace Access facet is in charge of keeping track of marketplace members.

### isAutomaton

```solidity
function isAutomaton(address candidate) external view returns (bool)
```

Queries whether a given address is a automaton or not.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `bool` equal to `true` when `candidate` is a automaton. |

### automatonPrivileges

```solidity
function automatonPrivileges(address automaton) external view returns (uint256)
```

Queries flags assigned to a given automaton account.

| Name | Type | Description |
| ---- | ---- | ----------- |
| automaton | address | is the address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | A `uint256` representing a binary combination of possible flags. |

### automatonCount

```solidity
function automatonCount() external view returns (uint256)
```

Queries the number of automatons.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An `uint256`. |

### paginateAutomatons

```solidity
function paginateAutomatons(uint256 index, uint256 perPage) external view returns (address[], uint256)
```

Queries pages of automatons based on a start index and a page size.

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | is the offset at which the pagination operation should start. |
| perPage | uint256 | is how many items should be returned. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page. |
| [1] | uint256 |  |

### setAutomatonPrivileges

```solidity
function setAutomatonPrivileges(address candidate, uint256 privileges) external
```

Adds a automaton to the list of known automatons.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the address to be added. |
| privileges | uint256 |  |

### removeAutomaton

```solidity
function removeAutomaton(address candidate) external
```

