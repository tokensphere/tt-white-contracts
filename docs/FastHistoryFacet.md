# Solidity API

## FastHistoryFacet

Although past events could be scrapped from the chain, we want to
the frontend to be capable of listing past transfers and minting / burning events.
This facet is in charge of performing archival of these things.

### minted

```solidity
function minted(uint256 amount, string ref) external
```

This method is a callback for other facets to signal whenever new tokens are minted.

Business logic:
- Requires that the caller must be another facet.
- Adds a supply proof item of type `LibFastHistory.SupplyOp.Mint` on top of the stack.

### burnt

```solidity
function burnt(uint256 amount, string ref) external
```

This method is a callback for other facets to signal whenever new tokens are burnt.

Business logic:
- Requires that the caller must be another facet.
- Adds a supply proof item of type `LibFastHistory.SupplyOp.Burn` on top of the stack.

### supplyProofCount

```solidity
function supplyProofCount() external view returns (uint256)
```

Returns the number of supply proofs (minting and burning together) ever created.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | A `uint256`. |

### paginateSupplyProofs

```solidity
function paginateSupplyProofs(uint256 cursor, uint256 perPage) external view returns (struct LibFastHistory.SupplyProof[], uint256)
```

Returns a page of supply proofs (minting and burning together).

| Name | Type | Description |
| ---- | ---- | ----------- |
| cursor | uint256 | is the zero-based index where to start fetching records. |
| perPage | uint256 | is the number of items to return. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct LibFastHistory.SupplyProof[] | A `(LibFastHistory.SupplyProof[], uint256)` tuple containing a page of data and the cursor to the next page. |
| [1] | uint256 |  |

### transfered

```solidity
function transfered(address spender, address from, address to, uint256 amount, string ref) external
```

This method is a callback for other facets to signal whenever a transfer has completed successfuly.

Business logic:
- Requires that the caller must be another facet.
- Keeps track of the operation in various tracking structures, so that it can be queried later by `sender` and `recipient`.
- Pushes a transfer proof to the main transfer proof tracking stack.

### transferProofCount

```solidity
function transferProofCount() external view returns (uint256)
```

Returns the number of transfer proofs ever created.

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | A `uint256`. |

### paginateTransferProofs

```solidity
function paginateTransferProofs(uint256 cursor, uint256 perPage) external view returns (struct LibFastHistory.TransferProof[], uint256)
```

Returns a page of transfer proofs.

| Name | Type | Description |
| ---- | ---- | ----------- |
| cursor | uint256 | is the zero-based index where to start fetching records. |
| perPage | uint256 | is the number of items to return. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct LibFastHistory.TransferProof[] | A `(LibFastHistory.TransferProof[], uint256)` tuple containing a page of data and the cursor to the next page. |
| [1] | uint256 |  |

### transferProofByInvolveeCount

```solidity
function transferProofByInvolveeCount(address involvee) external view returns (uint256)
```

Counts all past inbound and outbound transfers involving a given address.

| Name | Type | Description |
| ---- | ---- | ----------- |
| involvee | address | is the address for which to get the transfer proofs. |

### paginateTransferProofIndicesByInvolvee

```solidity
function paginateTransferProofIndicesByInvolvee(address involvee, uint256 cursor, uint256 perPage) external view returns (uint256[], uint256)
```

Returns pages of indices of past inbound and outbound transfer proofs by involvee.

_This function is reading from an indexing data structure. Each index points to a record
in the main transfer proof storage, and can then be found in `transferProofs` at returned indices._

| Name | Type | Description |
| ---- | ---- | ----------- |
| involvee | address | is the address for which to retrieve a page of data. |
| cursor | uint256 | is where to start. |
| perPage | uint256 | is how many records at most should be returned. |

### paginateTransferProofsByInvolvee

```solidity
function paginateTransferProofsByInvolvee(address involvee, uint256 cursor, uint256 perPage) external view returns (struct LibFastHistory.TransferProof[], uint256)
```

Returns a page of inbound and outbound transfer proofs based on an involvee.#

| Name | Type | Description |
| ---- | ---- | ----------- |
| involvee | address | is the address for which to fetch the data. |
| cursor | uint256 | is where to start. |
| perPage | uint256 | is how many items at most to return. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct LibFastHistory.TransferProof[] | A `(LibFastHistory.TransferProof[], uint256)` tuple containing the results and the cursor to the next page. |
| [1] | uint256 |  |

## FastHistoryFacet

