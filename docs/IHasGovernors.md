# Solidity API

## IHasGovernors

### isGovernor

```solidity
function isGovernor(address candidate) external view returns (bool)
```

Queries whether a given address is a governor or not.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `bool` equal to `true` when `candidate` is a governor. |

### governorCount

```solidity
function governorCount() external view returns (uint256)
```

Queries the number of governors.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An `uint256`. |

### paginateGovernors

```solidity
function paginateGovernors(uint256 index, uint256 perPage) external view returns (address[], uint256)
```

Queries pages of governors based on a start index and a page size.

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | is the offset at which the pagination operation should start. |
| perPage | uint256 | is how many items should be returned. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page. |
| [1] | uint256 |  |

### addGovernor

```solidity
function addGovernor(address payable governor) external
```

Adds a governor to the list of known governors.

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address payable | is the address to be added. |

### removeGovernor

```solidity
function removeGovernor(address governor) external
```

Removes a governor from the list of known governors.

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address to be removed. |

## IHasGovernors

## IHasGovernors

## IHasGovernors

