# Solidity API

## IHasActiveMembers

### isActiveMember

```solidity
function isActiveMember(address member) external view returns (bool)
```

Queries whether a given account is a member of the marketplace and flagged as active.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address to query. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `bool` set to `true` if the candidate is an active member. |

### deactivateMember

```solidity
function deactivateMember(address member) external
```

Deactivates a given member address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address to deactivate. |

### activateMember

```solidity
function activateMember(address member) external
```

Activates a given member address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address to activate. |

