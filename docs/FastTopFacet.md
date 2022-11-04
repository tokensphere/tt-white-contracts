# Solidity API

## FastTopFacet

### issuerAddress

```solidity
function issuerAddress() external view returns (address)
```

Get the Issuer address.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Address of Issuer. |

### marketplaceAddress

```solidity
function marketplaceAddress() external view returns (address)
```

Get the Marketplace address.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | address Address of Marketplace. |

### isSemiPublic

```solidity
function isSemiPublic() external view returns (bool)
```

Is this FAST a semi public FAST?

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Yes/no semi public. |

### hasFixedSupply

```solidity
function hasFixedSupply() external view returns (bool)
```

Is this FAST a fixed supply FAST?

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Yes/no fixed supply. |

### transfersDisabled

```solidity
function transfersDisabled() external view returns (bool)
```

Are transfers enabled across this FAST?

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | `true` if transfers are disabled, `false` if transfers are enabled. |

### setIsSemiPublic

```solidity
function setIsSemiPublic(bool flag) external
```

Allows to switch from a private scheme to a semi-public scheme,
 but not the other way around.

| Name | Type | Description |
| ---- | ---- | ----------- |
| flag | bool | Set the semi public flag to true/false. |

### setTransfersDisabled

```solidity
function setTransfersDisabled(bool flag) external
```

Allows an issuer member to enable or disable all transfers within this FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| flag | bool | Set the transfer capability to active or not. |

## FastTopFacet

## FastTopFacet

## FastTopFacet

## FastTopFacet

### issuerAddress

```solidity
function issuerAddress() external view returns (address)
```

Get the Issuer address.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Address of Issuer. |

### marketplaceAddress

```solidity
function marketplaceAddress() external view returns (address)
```

Get the Marketplace address.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | address Address of Marketplace. |

### isSemiPublic

```solidity
function isSemiPublic() external view returns (bool)
```

Is this FAST a semi public FAST?

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Yes/no semi public. |

### hasFixedSupply

```solidity
function hasFixedSupply() external view returns (bool)
```

Is this FAST a fixed supply FAST?

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Yes/no fixed supply. |

### setIsSemiPublic

```solidity
function setIsSemiPublic(bool flag) external
```

Allows to switch from a private scheme to a semi-public scheme,
 but not the other way around.

| Name | Type | Description |
| ---- | ---- | ----------- |
| flag | bool | Set the semi public flag to true/false. |

