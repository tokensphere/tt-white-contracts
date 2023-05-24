# Solidity API

## AHasMembers

The Fast Members abstract contract is in charge of keeping track of automaton accounts.

### RequiresMembersManager

```solidity
error RequiresMembersManager(address who)
```

Happens when a function is called by an address that is not a members manager.

### RequiresValidMember

```solidity
error RequiresValidMember(address who)
```

Happens when an address is used as a member but is not valid.

### MemberAdded

```solidity
event MemberAdded(address member)
```

Emited when a member is added to the implementing contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address of the added member. |

### MemberRemoved

```solidity
event MemberRemoved(address member)
```

Emited when a member is removed to the implementing contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address of the removed member. |

### isMembersManager

```solidity
function isMembersManager(address who) internal view virtual returns (bool)
```

Checks whether the given address is a members manager or not.

_Must be implemented by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | is the address to test. |

### isValidMember

```solidity
function isValidMember(address who) internal view virtual returns (bool)
```

Checks whether the given address can be added as a member or not.

_Must be implemented by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | is the address to test. |

### onMemberAdded

```solidity
function onMemberAdded(address member) internal virtual
```

This callback is called when a member is added to the contract.

_May be overriden by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address which was added. |

### onMemberRemoved

```solidity
function onMemberRemoved(address member) internal virtual
```

This callback is called when a member is removed to the contract.

_May be overriden by the inheriting contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address which was removed. |

### isMember

```solidity
function isMember(address who) external view returns (bool)
```

Queries whether a given address is a member or not.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | is the address to test. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `bool` equal to `true` when `candidate` is a member. |

### memberCount

```solidity
function memberCount() external view returns (uint256)
```

Queries the number of members.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An `uint256`. |

### paginateMembers

```solidity
function paginateMembers(uint256 index, uint256 perPage) external view returns (address[], uint256)
```

Queries pages of members based on a start index and a page size.

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

### addMember

```solidity
function addMember(address who) external
```

Adds a member to the list of known members.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | is the address to be added. |

### removeMember

```solidity
function removeMember(address member) external
```

Removes a member from this contract.
Requires that the caller is a member of this Issuer.
Emits a `AHasMembers.MemberRemoved` event.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The address of the member to be removed. |

### onlyMemberManager

```solidity
modifier onlyMemberManager(address who)
```

Modifiers.

### onlyValidMember

```solidity
modifier onlyValidMember(address who)
```

