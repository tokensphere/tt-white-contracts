# Solidity API

## IssuerTopFacet

### isFastRegistered

```solidity
function isFastRegistered(address fast) external view returns (bool)
```

Queries whether a given address is a known and registered FAST contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fast | address | The address of the contract to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A boolean. |

### fastBySymbol

```solidity
function fastBySymbol(string symbol) external view returns (address)
```

Allows to retrieve the address of a FAST diamond given its symbol.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| symbol | string | The symbol of the FAST diamond to get the address of. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the corresponding FAST diamond, or the Zero Address if not found. |

### registerFast

```solidity
function registerFast(address fast) external
```

Allows the registration of a given FAST diamond with this Issuer.
Requires that the caller is a member of this Issuer.
Emits a `FastRegistered` event.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fast | address | The address of the FAST diamond to be registered. |

### unregisterFast

```solidity
function unregisterFast(address fast) external
```

Allows the unregistration of a given FAST diamond with this Issuer.
Requires that the caller is a member of this Issuer.
Emits a `FastUnregistered` event.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fast | address | The address of the FAST diamond to be unregistered. |

### fastCount

```solidity
function fastCount() external view returns (uint256)
```

Counts the number of FAST diamonds registered with this Issuer.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of FAST diamonds registered with this Issuer. |

### paginateFasts

```solidity
function paginateFasts(uint256 cursor, uint256 perPage) external view returns (address[], uint256)
```

Paginates the FAST diamonds registered with this Issuer based on a starting cursor and a number of records per page.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| cursor | uint256 | The index at which to start. |
| perPage | uint256 | How many records should be returned at most. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | A `address[]` list of values at most `perPage` big. |
| [1] | uint256 | A `uint256` index to the next page. |

### transferERC20Tokens

```solidity
function transferERC20Tokens(contract IERC20 token, uint256 amount, address to) public
```

Allows an issuer member to move collected ERC20 fees from this contract
to an arbitrary address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | contract IERC20 | is the address of the ERC20 to be collected. |
| amount | uint256 | is how much should be moved from the ERC20 to the collection address. |
| to | address | is the collection address - eg the address that will receive the ERC20 tokens. |

