# Solidity API

## IssuerAccessFacet

### isMember

```solidity
function isMember(address candidate) external view returns (bool)
```

Queries whether a given address is a member of this Issuer or not.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | The address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `boolean` flag. |

### memberCount

```solidity
function memberCount() external view returns (uint256)
```

Counts the numbers of members present in this Issuer.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of members in this Issuer. |

### paginateMembers

```solidity
function paginateMembers(uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Paginates the members of this Issuer based on a starting cursor and a number of records per page.

| Name | Type | Description |
| ---- | ---- | ----------- |
| cursor | uint256 | The index at which to start. |
| perPage | uint256 | How many records should be returned at most. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | A `address[]` list of values at most `perPage` big. |
| [1] | uint256 | A `uint256` index to the next page. |

### addMember

```solidity
function addMember(address payable member) external
```

Adds a member to this Issuer member list.
Requires that the caller is a member of this Issuer.
Emits a `IHasMembers.MemberAdded` event.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address payable | The address of the member to be added. |

### removeMember

```solidity
function removeMember(address member) external
```

Removes a member from this Issuer.
Requires that the caller is a member of this Issuer.
Emits a `IHasMembers.MemberRemoved` event.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The address of the member to be removed. |

### governorAddedToFast

```solidity
function governorAddedToFast(address governor) external
```

Callback from FAST contracts allowing the Issuer contract to keep track of governorships.

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | The governor added to a FAST. |

### governorRemovedFromFast

```solidity
function governorRemovedFromFast(address governor) external
```

Callback from FAST contracts allowing the Issuer contract to keep track of governorships.

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | The governor removed from a FAST. |

### paginateGovernorships

```solidity
function paginateGovernorships(address governor, uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Returns a list of FASTs that the passed address is a governor of.

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address to check governorships of. |
| cursor | uint256 | is the index at which to start. |
| perPage | uint256 | is how many records should be returned at most. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | A `address[]` list of values at most `perPage` big. |
| [1] | uint256 | A `uint256` index to the next page. |

## IssuerAccessFacet

### isMember

```solidity
function isMember(address candidate) external view returns (bool)
```

Queries whether a given address is a member of this Issuer or not.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | The address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `boolean` flag. |

### memberCount

```solidity
function memberCount() external view returns (uint256)
```

Counts the numbers of members present in this Issuer.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of members in this Issuer. |

### paginateMembers

```solidity
function paginateMembers(uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Paginates the members of this Issuer based on a starting cursor and a number of records per page.

| Name | Type | Description |
| ---- | ---- | ----------- |
| cursor | uint256 | The index at which to start. |
| perPage | uint256 | How many records should be returned at most. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | A `address[]` list of values at most `perPage` big. |
| [1] | uint256 | A `uint256` index to the next page. |

### addMember

```solidity
function addMember(address payable member) external
```

Adds a member to this Issuer member list.
Requires that the caller is a member of this Issuer.
Emits a `IHasMembers.MemberAdded` event.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address payable | The address of the member to be added. |

### removeMember

```solidity
function removeMember(address member) external
```

Removes a member from this Issuer.
Requires that the caller is a member of this Issuer.
Emits a `IHasMembers.MemberRemoved` event.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The address of the member to be removed. |

### governorAddedToFast

```solidity
function governorAddedToFast(address governor) external
```

Callback from FAST contracts allowing the Issuer contract to keep track of governorships.

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | The governor added to a FAST. |

### governorRemovedFromFast

```solidity
function governorRemovedFromFast(address governor) external
```

Callback from FAST contracts allowing the Issuer contract to keep track of governorships.

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | The governor removed from a FAST. |

### paginateGovernorships

```solidity
function paginateGovernorships(address governor, uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Returns a list of FASTs that the passed address is a governor of.

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address to check governorships of. |
| cursor | uint256 | is the index at which to start. |
| perPage | uint256 | is how many records should be returned at most. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | A `address[]` list of values at most `perPage` big. |
| [1] | uint256 | A `uint256` index to the next page. |

