# Solidity API

## MarketplaceAccessFacet

The Marketplace Access facet is in charge of keeping track of marketplace members.

### isMembersManager

```solidity
function isMembersManager(address who) internal view returns (bool)
```

AHasMembers implementation.

### isValidMember

```solidity
function isValidMember(address who) internal pure returns (bool)
```

### onMemberRemoved

```solidity
function onMemberRemoved(address member) internal view
```

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

