# Solidity API

## IssuerAccessFacet

### isMembersManager

```solidity
function isMembersManager(address who) internal view returns (bool)
```

AHasMembers implementation.

### isValidMember

```solidity
function isValidMember(address who) internal pure returns (bool)
```

### governorAddedToFast

```solidity
function governorAddedToFast(address governor) external
```

Callback from FAST contracts allowing the Issuer contract to keep track of governorships.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | The governor added to a FAST. |

### governorRemovedFromFast

```solidity
function governorRemovedFromFast(address governor) external
```

Callback from FAST contracts allowing the Issuer contract to keep track of governorships.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | The governor removed from a FAST. |

### paginateGovernorships

```solidity
function paginateGovernorships(address governor, uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Returns a list of FASTs that the passed address is a governor of.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address to check governorships of. |
| cursor | uint256 | is the index at which to start. |
| perPage | uint256 | is how many records should be returned at most. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | A `address[]` list of values at most `perPage` big. |
| [1] | uint256 | A `uint256` index to the next page. |

