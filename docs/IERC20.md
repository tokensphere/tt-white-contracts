# Solidity API

## IERC20

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

Allows to query the total number of tokens in circulation.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An `uint256` representing how many tokens are currently in circulation. |

### balanceOf

```solidity
function balanceOf(address account) external view returns (uint256)
```

Allows to query the balance of a given address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | is the address for which the balance shall be queried. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An `uint256` - the balance for the given address. |

### transfer

```solidity
function transfer(address recipient, uint256 amount) external returns (bool)
```

Moves `amount` tokens from the caller's account to `recipient`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | is the address to which the funds should be sent to, if successful. |
| amount | uint256 | is the amount of tokens to transfef. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `bool` which value is `true` when the operation was successful. |

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```

Returns the remaining number of tokens that `spender` will be allowed to spend on behalf of `owner`
through `transferFrom`. This is zero by default.

_This value changes when `approve`, `disapprove` and `transferFrom` / `transferFromWithRef` are called._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | is the owner of the funds. |
| spender | address | is the address for which the allowance should be queried. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | A `uint256` representing the remaining allowance of `spender` over `owner`'s funds. |

### approve

```solidity
function approve(address spender, uint256 amount) external returns (bool)
```

Increases the allowance of `spender` by `amount`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| spender | address | is the address towards which the allowance should be given. |
| amount | uint256 |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `bool` set to `true` when the operation was successful. |

### transferFrom

```solidity
function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)
```

Attempts to transfer `amount` tokens from `sender` to `recipient` using the
allowance mechanism. `amount` is then deducted from the caller's allowance.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `bool` set to `true` when the operation was successful. |

