# Solidity API

## IHasMembers

### isMember

```solidity
function isMember(address candidate) external view returns (bool)
```

Queries whether a given address is a member or not.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `bool` equal to `true` when `candidate` is a member. |

### memberCount

```solidity
function memberCount() external view returns (uint256)
```

Queries the number of members.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An `uint256`. |

### paginateMembers

```solidity
function paginateMembers(uint256 index, uint256 perPage) external view returns (address[], uint256)
```

Queries pages of members based on a start index and a page size.

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | is the offset at which the pagination operation should start. |
| perPage | uint256 | is how many items should be returned. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page. |
| [1] | uint256 |  |

### addMember

```solidity
function addMember(address payable candidate) external
```

Adds a member to the list of known members.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address payable | is the address to be added. |

### removeMember

```solidity
function removeMember(address member) external
```

Removes a member from the list of known members.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address to be removed. |

