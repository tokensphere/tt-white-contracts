# Solidity API

## FastTopFacet

### issuerAddress

```solidity
function issuerAddress() external view returns (address)
```

Get the Issuer address.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | address Address of Issuer. |

### marketplaceAddress

```solidity
function marketplaceAddress() external view returns (address)
```

Get the Marketplace address.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | address Address of Marketplace. |

### isSemiPublic

```solidity
function isSemiPublic() external view returns (bool)
```

Is this FAST a semi public FAST?

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Yes/no semi public. |

### hasFixedSupply

```solidity
function hasFixedSupply() external view returns (bool)
```

Is this FAST a fixed supply FAST?

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Yes/no fixed supply. |

### transfersDisabled

```solidity
function transfersDisabled() external view returns (bool)
```

Are transfers enabled across this FAST?

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | boolean `true` if transfers are disabled, `false` if transfers are enabled. |

### setIsSemiPublic

```solidity
function setIsSemiPublic(bool flag) external
```

Allows to switch from a private scheme to a semi-public scheme,
 but not the other way around, unless the total supply is zero.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| flag | bool | Set the semi public flag to true/false. |

### setTransfersDisabled

```solidity
function setTransfersDisabled(bool flag) external
```

Allows an issuer member to enable or disable all transfers within this FAST.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| flag | bool | Set the transfer capability to active or not. |

### group

```solidity
function group() external view returns (string)
```

Retrieves the group slug to which this FAST belongs.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | string The group slug string. |

### setGroup

```solidity
function setGroup(string newGroup) external
```

Assigns the FAST into a group given its slug.
It should only be callable by the Issuer contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newGroup | string | is the slug for the new group for this FAST. |

