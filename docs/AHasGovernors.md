# Solidity API

## AHasGovernors

The Fast Governors abstract contract is in charge of keeping track of automaton accounts.

### RequiresGovernorsManager

```solidity
error RequiresGovernorsManager(address who)
```

Happens when a function is called by an address that is not a governors manager.

### RequiresValidGovernor

```solidity
error RequiresValidGovernor(address who)
```

Happens when an address is used as a governor but is not valid.

### GovernorAdded

```solidity
event GovernorAdded(address governor)
```

Emited when a governor is added to the implementing contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address of the added governor. |

### GovernorRemoved

```solidity
event GovernorRemoved(address governor)
```

Emited when a governor is removed to the implementing contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address of the removed member. |

### isGovernorsManager

```solidity
function isGovernorsManager(address who) internal view virtual returns (bool)
```

Checks whether the caller is a governor manager or not.

_Must be implemented by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | is the address to test. |

### isValidGovernor

```solidity
function isValidGovernor(address who) internal view virtual returns (bool)
```

Checks whether the given address can be added as a governor or not.

_Must be implemented by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | is the address to test. |

### onGovernorAdded

```solidity
function onGovernorAdded(address governor) internal virtual
```

This callback is called when a governor is added to the contract.

_May be overriden by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address which was added. |

### onGovernorRemoved

```solidity
function onGovernorRemoved(address governor) internal virtual
```

This callback is called when a governor is removed to the contract.

_May be overriden by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address which was removed. |

### isGovernor

```solidity
function isGovernor(address who) external view returns (bool)
```

Queries whether a given address is a governor or not.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | is the address to test. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `bool` equal to `true` when `candidate` is a governor. |

### governorCount

```solidity
function governorCount() external view returns (uint256)
```

Queries the number of governors.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An `uint256`. |

### paginateGovernors

```solidity
function paginateGovernors(uint256 index, uint256 perPage) external view returns (address[], uint256)
```

Queries pages of governors based on a start index and a page size.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | is the offset at which the pagination operation should start. |
| perPage | uint256 | is how many items should be returned. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page. |
| [1] | uint256 |  |

### addGovernor

```solidity
function addGovernor(address who) external
```

Adds a governor to the list of known governors.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | is the address to be added. |

### removeGovernor

```solidity
function removeGovernor(address governor) external
```

Removes a governor from this contract.
Requires that the caller is a governor of this Issuer.
Emits a `AHasGovernors.GovernorRemoved` event.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | The address of the governor to be removed. |

### onlyGovernorManager

```solidity
modifier onlyGovernorManager(address who)
```

Modifiers.

### onlyValidGovernor

```solidity
modifier onlyValidGovernor(address who)
```

