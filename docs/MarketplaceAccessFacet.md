# Solidity API

## MarketplaceAccessFacet

The Marketplace Access facet is in charge of keeping track of marketplace members.

### isMember

```solidity
function isMember(address candidate) external view returns (bool)
```

Queries whether a given address is a member of this Marketplace or not.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `boolean` flag. |

### memberCount

```solidity
function memberCount() external view returns (uint256)
```

Counts the numbers of members present in this Marketplace.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of members in this marketplace. |

### paginateMembers

```solidity
function paginateMembers(uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Paginates the members of this Marketplace based on a starting cursor and a number of records per page.

| Name | Type | Description |
| ---- | ---- | ----------- |
| cursor | uint256 | is the index at which to start. |
| perPage | uint256 | is how many records should be returned at most. |

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

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address of the member to be removed. |

### fastMemberships

```solidity
function fastMemberships(address member, uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Allows to query FAST memberships for a given member address.

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

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member for which a new FAST membership has been added. |

### memberRemovedFromFast

```solidity
function memberRemovedFromFast(address member) external
```

Callback from FAST contracts allowing the Marketplace contract to keep track of FAST memberships.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member for which a FAST membership has been removed. |

### isMemberActive

```solidity
function isMemberActive(address member) external view returns (bool)
```

Given a member returns it's activation status.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member to check activation status on. |

### activateMember

```solidity
function activateMember(address member) external
```

Activates a member at the Marketplace level.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member to remove from the deactivation member set. |

### deactivateMember

```solidity
function deactivateMember(address payable member) external
```

Deactivates a member at the Marketplace level.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address payable | The member to add to the deactivation member set. |

## MarketplaceAccessFacet

The Marketplace Access facet is in charge of keeping track of marketplace members.

### isMember

```solidity
function isMember(address candidate) external view returns (bool)
```

Queries whether a given address is a member of this Marketplace or not.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `boolean` flag. |

### memberCount

```solidity
function memberCount() external view returns (uint256)
```

Counts the numbers of members present in this Marketplace.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of members in this marketplace. |

### paginateMembers

```solidity
function paginateMembers(uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Paginates the members of this Marketplace based on a starting cursor and a number of records per page.

| Name | Type | Description |
| ---- | ---- | ----------- |
| cursor | uint256 | is the index at which to start. |
| perPage | uint256 | is how many records should be returned at most. |

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

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address of the member to be removed. |

### fastMemberships

```solidity
function fastMemberships(address member, uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Allows to query FAST memberships for a given member address.

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

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member for which a new FAST membership has been added. |

### memberRemovedFromFast

```solidity
function memberRemovedFromFast(address member) external
```

Callback from FAST contracts allowing the Marketplace contract to keep track of FAST memberships.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member for which a FAST membership has been removed. |

### isMemberActive

```solidity
function isMemberActive(address member) external view returns (bool)
```

Given a member returns it's activation status.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member to check activation status on. |

### activateMember

```solidity
function activateMember(address member) external
```

Activates a member at the Marketplace level.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member to remove from the deactivation member set. |

### deactivateMember

```solidity
function deactivateMember(address payable member) external
```

Deactivates a member at the Marketplace level.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address payable | The member to add to the deactivation member set. |

## MarketplaceAccessFacet

The Marketplace Access facet is in charge of keeping track of marketplace members.

### isMember

```solidity
function isMember(address candidate) external view returns (bool)
```

Queries whether a given address is a member of this Marketplace or not.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | is the address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `boolean` flag. |

### memberCount

```solidity
function memberCount() external view returns (uint256)
```

Counts the numbers of members present in this Marketplace.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of members in this marketplace. |

### paginateMembers

```solidity
function paginateMembers(uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Paginates the members of this Marketplace based on a starting cursor and a number of records per page.

| Name | Type | Description |
| ---- | ---- | ----------- |
| cursor | uint256 | is the index at which to start. |
| perPage | uint256 | is how many records should be returned at most. |

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

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address of the member to be removed. |

### fastMemberships

```solidity
function fastMemberships(address member, uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Allows to query FAST memberships for a given member address.

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

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member for which a new FAST membership has been added. |

### memberRemovedFromFast

```solidity
function memberRemovedFromFast(address member) external
```

Callback from FAST contracts allowing the Marketplace contract to keep track of FAST memberships.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member for which a FAST membership has been removed. |

### isMemberActive

```solidity
function isMemberActive(address member) external view returns (bool)
```

Given a member returns it's activation status.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member to check activation status on. |

### activateMember

```solidity
function activateMember(address member) external
```

Activates a member at the Marketplace level.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | The member to remove from the deactivation member set. |

### deactivateMember

```solidity
function deactivateMember(address payable member) external
```

Deactivates a member at the Marketplace level.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address payable | The member to add to the deactivation member set. |

## MarketplaceAccessFacet

