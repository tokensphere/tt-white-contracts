# Solidity API

## FastTokenFacet

### mint

```solidity
function mint(uint256 amount, string ref) external
```

Mints an amount of FAST tokens.
 A reference can be passed to identify why this happened for example.

Business logic:
- Modifiers:
  - Requires the caller to be a member of the Issuer contract.
- Requires that either the token has continuous supply, or that no tokens have been minted yet.
- Increases the reserve balance by `amount`.
- Calls `FastHistoryFacet.minted`.
- Calls `FastFrontendFacet.emitDetailsChanged`.
- Emits a `Minted(amount, ref)` event.

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The number of FAST tokens to mint. |
| ref | string | A reference for this minting operation. |

### burn

```solidity
function burn(uint256 amount, string ref) external
```

Burns an amount of FAST tokens.
 A reference can be passed to identify why this happened for example.
 Can only be called by an Issuer member. Business logic.
- Modifiers:
  - Requires the caller to be a member of the Issuer contract.
- Requires that either the token has continuous supply.
- Requires that there are enough funds in the reserve to cover for `amount` being burnt.
- Decreases the reserve balance by `amount`.
- Calls `FastHistoryFacet.burnt(amount, ref)`.
- Calls `FastFrontendFacet.emitDetailsChanged`.
- Emits a `Burnt(amount, ref)`.

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The number of FAST tokens to mint. |
| ref | string | A reference for this minting operation. |

### transferCredits

```solidity
function transferCredits() external view returns (uint256)
```

Get the current `transferCredits` for this FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Number of transfer credits remaining. |

### addTransferCredits

```solidity
function addTransferCredits(uint256 amount) external
```

Adds `amount` of transfer credits to this FAST.

### drainTransferCredits

```solidity
function drainTransferCredits() external
```

Drains the transfer credits from this FAST.

Business logic:
- Modifiers:
  - Requires the caller to be a member of the Issuer contract.
- Emits a `TransferCreditsDrained(caller, previousTransferCredits)`.
- Sets transfer credits to zero.
- Calls `FastFrontendFacet.emitDetailsChanged`

### name

```solidity
function name() external view returns (string)
```

The name of this FAST (ERC20 standard).

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | string Name of the FAST. |

### symbol

```solidity
function symbol() external view returns (string)
```

The symbol of this FAST (ERC20 standard).

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | string Symbol of the FAST. |

### decimals

```solidity
function decimals() external view returns (uint256)
```

The `decimals` of this FAST (ERC20 standard).

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Number of decimals the FAST has. |

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

The total supply of the FAST (ERC20 standard).

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Total supply of the FAST. |

### balanceOf

```solidity
function balanceOf(address owner) public view returns (uint256)
```

The balance of the passed owner (ERC20 standard).

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The owners address to get the balance of. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The current balance of this owner's account. |

### transfer

```solidity
function transfer(address to, uint256 amount) external returns (bool)
```

See `performTransfer`, the spender will be equal to the `owner`, and the `ref` will be defauted.

### transferWithRef

```solidity
function transferWithRef(address to, uint256 amount, string ref) external
```

See `performTransfer`, the spender will be equal to the `owner`.

### allowance

```solidity
function allowance(address owner, address spender) public view returns (uint256)
```

Returns the remaining number of tokens that `spender` will be allowed to spend on behalf of `owner`
through `transferFrom`. This is zero by default.

_This value changes when `approve` or `transferFrom` are called._

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | is the owner of the funds. |
| spender | address | is the address for which the allowance should be queried. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | A `uint256` representing the remaining allowance of `spender` over `owner`'s funds. |

### approve

```solidity
function approve(address spender, uint256 amount) external returns (bool)
```

This method directly calls `performApproval`, setting its `from` paramter to the sender of
the transaction.

| Name | Type | Description |
| ---- | ---- | ----------- |
| spender | address | is the address to allow spending from the caller's wallet. |
| amount | uint256 | is how much to **increase** the allowance. |

### disapprove

```solidity
function disapprove(address spender) external
```

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 amount) external returns (bool)
```

See `performTransfer`, the `ref` will be defaulted.

### transferFromWithRef

```solidity
function transferFromWithRef(address from, address to, uint256 amount, string ref) public
```

See `performTransfer`.

### givenAllowanceCount

```solidity
function givenAllowanceCount(address owner) external view returns (uint256)
```

### paginateAllowancesByOwner

```solidity
function paginateAllowancesByOwner(address owner, uint256 index, uint256 perPage) external view returns (address[], uint256)
```

### receivedAllowanceCount

```solidity
function receivedAllowanceCount(address spender) external view returns (uint256)
```

### paginateAllowancesBySpender

```solidity
function paginateAllowancesBySpender(address spender, uint256 index, uint256 perPage) external view returns (address[], uint256)
```

### detectTransferRestriction

```solidity
function detectTransferRestriction(address, address, uint256) external pure returns (uint8)
```

### messageForTransferRestriction

```solidity
function messageForTransferRestriction(uint8) external pure returns (string)
```

### TransferArgs

```solidity
struct TransferArgs {
  address spender;
  address from;
  address to;
  uint256 amount;
  string ref;
}
```

### performTransfer

```solidity
function performTransfer(struct FastTokenFacet.TransferArgs p) external
```

This is the internal method that gets called whenever a transfer is initiated. Both `transfer`,
`transferWithRef`, and their variants internally call this function.

Business logic:
- Modifiers:
  - Only facets of the current diamond should be able to call this.
  - Requires that `from` and `to` addresses are different.
  - Requires that `onlyTokenHolder` passes for the `from` address.
  - Requires that the `from` address is an active Marketplace contract member.
  - Requires that `onlyTokenHolder` passes for the `to` address.
- Requires that the `from` address has enough funds to cover for `amount`.
- Requires that the amount is a positive value.
- If the transfer is an allowance - e.g. the `spender` is not the same as the `from` address,
  - The allowance given by the `from` address to the `spender` covers for the `amount`.
    - If we are **not** transfering **from** the reserve,
      - Decreases the allowance given by `from` to `spender`.
        - If the new allowance reaches zero,
          - Stop tracking the allowance in the allowance lookup tables for both spending and receiving directions.
- Decreases the balance of the `owner` address.
- Increases the balance of the `to` address by `amount`.
- If we are **not** transfering **from** the reserve,
  - Requires that there are enough transfer credits to cover for `amount`.
  - Decreases the transfer credits by `amount`.
- If the `to` address is the reserve,
  - Decreases the total supply by `amount`.
  - Calls `FastFrontendFacet.emitDetailsChanged`.
- Else, if the `from` address is the reserve,
  - Increases the total supply by `amount`.
  - Calls `FastFrontendFacet.emitDetailsChanged`.
- Calls `FastHistoryFacet.transfered`.
- Emits a `Transfer(from, to, amount)` event.

### performApproval

```solidity
function performApproval(address from, address spender, uint256 amount) external
```

Increases the allowance given by `from` to `spender` by `amount`.

Business logic:
- Modifiers:
  - Only facets of the current diamond should be able to call this.
  - Requires that `onlyTokenHolder` passes for the `from` address.
- Requires that the `amount` is positive number.
- Increases the allowance given by `from` to `spender` by `amount`.
- Update the allowance lookup tables in both directions.
- Emits an `Approval(from, spender, amount)`.

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | is the wallet from which to give the allowance. |
| spender | address | is the receiver of the allowance. |
| amount | uint256 | is how much to **increase** the current allowance by. |

### performDisapproval

```solidity
function performDisapproval(address from, address spender) external
```

### beforeRemovingMember

```solidity
function beforeRemovingMember(address member) external
```

### holders

```solidity
function holders() external view returns (address[])
```

### holdingUpdated

```solidity
function holdingUpdated(address holder) private
```

### onlyTokenHolder

```solidity
modifier onlyTokenHolder(address candidate)
```

Ensures that the given address is a member of the current FAST or the Zero Address.

Business logic:
 - If the candidate is not the reserve,
   - If the fast is semi-public,
     - We require that candidate is a member of the Marketplace contract.
 - Otherwise,
   - Require that the candidate is a member of the Token contract.

| Name | Type | Description |
| ---- | ---- | ----------- |
| candidate | address | The address to check. |

