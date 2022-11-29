# Solidity API

## MarketplaceAccessFacet

The Marketplace Access facet is in charge of keeping track of marketplace members.

### isMember

```solidity
function isMember(address candidate) external view returns (bool)
```

Queries whether a given address is a member of this Marketplace or not.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the address to test. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `boolean` flag. |

### memberCount

```solidity
function memberCount() external view returns (uint256)
```

Counts the numbers of members present in this Marketplace.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of members in this marketplace. |

### paginateMembers

```solidity
function paginateMembers(uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Paginates the members of this Marketplace based on a starting cursor and a number of records per page.

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

### addMember

```solidity
function addMember(address payable member) external
```

Adds a member to this Marketplace member list.
Requires that the caller is a member of the linked Issuer.
Emits a `IHasMembers.MemberAdded` event.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address payable | is the address of the member to be added. |

### removeMember

```solidity
function removeMember(address member) external
```

Removes a member from this Marketplace.
Requires that the caller is a member of the linked Issuer.
Emits a `IHasMembers.MemberRemoved` event.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address of the member to be removed. |

### fastMemberships

```solidity
function fastMemberships(address member, uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Allows to query FAST memberships for a given member address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | Is the address to check. |
| cursor | uint256 | The index at which to start. |
| perPage | uint256 | How many records should be returned at most. |

### memberAddedToFast

```solidity
function memberAddedToFast(address member) external
```

Callback from FAST contracts allowing the Marketplace contract to keep track of FAST memberships.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member for which a new FAST membership has been added. |

### memberRemovedFromFast

```solidity
function memberRemovedFromFast(address member) external
```

Callback from FAST contracts allowing the Marketplace contract to keep track of FAST memberships.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member for which a FAST membership has been removed. |

### isActiveMember

```solidity
function isActiveMember(address candidate) external view returns (bool)
```

Given a member returns it's activation status.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | The address to check activation status on. |

### activateMember

```solidity
function activateMember(address member) external
```

Activates a member at the Marketplace level.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member to remove from the deactivation member set. |

### deactivateMember

```solidity
function deactivateMember(address payable member) external
```

Deactivates a member at the Marketplace level.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address payable | The member to add to the deactivation member set. |

### isAutomaton

```solidity
function isAutomaton(address candidate) external view returns (bool)
```

Queries whether a given address is a automaton or not.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the address to test. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `bool` equal to `true` when `candidate` is a automaton. |

### automatonPrivileges

```solidity
function automatonPrivileges(address automaton) external view returns (uint256)
```

Queries flags assigned to a given automaton account.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| automaton | address | is the address to test. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | A `uint256` representing a binary combination of possible flags. |

### automatonCount

```solidity
function automatonCount() external view returns (uint256)
```

Queries the number of automatons.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An `uint256`. |

### paginateAutomatons

```solidity
function paginateAutomatons(uint256 index, uint256 perPage) external view returns (address[], uint256)
```

Queries pages of automatons based on a start index and a page size.

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

### automatonPrivilegesStruct

```solidity
function automatonPrivilegesStruct(address automaton) external view returns (struct LibMarketplaceAutomatons.Privileges)
```

### setAutomatonPrivileges

```solidity
function setAutomatonPrivileges(address candidate, uint256 privileges) external
```

Adds a automaton to the list of known automatons.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the address to be added. |
| privileges | uint256 |  |

### removeAutomaton

```solidity
function removeAutomaton(address candidate) external
```

