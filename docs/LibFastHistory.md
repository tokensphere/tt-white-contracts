# Solidity API

## LibFastHistory

This library centralises shared functionality between FAST diamonds facets that have to do with transfer
history tracking.

_Note that if you feel like a method should be created inside this library, you might want to really consider
whether or not it is the right place for it. Any facet using a method from internal libraries see their bytecode
size increase, kind of defeating the benefits of using facets in the first place. So please keep it reasonable._

### STORAGE_VERSION

```solidity
uint16 STORAGE_VERSION
```

The current version of the storage.

### STORAGE_SLOT

```solidity
bytes32 STORAGE_SLOT
```

This is keccak256('Fast.storage.History'):

### Data

```solidity
struct Data {
  uint16 version;
  struct LibFastHistory.SupplyProof[] supplyProofs;
  struct LibFastHistory.TransferProof[] transferProofs;
  mapping(address => uint256[]) transferProofInvolvements;
}
```

### SupplyOp

```solidity
enum SupplyOp {
  Mint,
  Burn
}
```

### SupplyProof

```solidity
struct SupplyProof {
  enum LibFastHistory.SupplyOp op;
  uint256 amount;
  uint256 blockNumber;
  string ref;
}
```

### TransferProof

```solidity
struct TransferProof {
  address spender;
  address from;
  address to;
  uint256 amount;
  uint256 blockNumber;
  string ref;
}
```

### data

```solidity
function data() internal pure returns (struct LibFastHistory.Data s)
```

Returns the history storage for the calling FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| s | struct LibFastHistory.Data | a struct pointer for history FAST data storage. |

## LibFastHistory

## LibFastHistory

This library centralises shared functionality between FAST diamonds facets that have to do with transfer
history tracking.

_Note that if you feel like a method should be created inside this library, you might want to really consider
whether or not it is the right place for it. Any facet using a method from internal libraries see their bytecode
size increase, kind of defeating the benefits of using facets in the first place. So please keep it reasonable._

### STORAGE_VERSION

```solidity
uint16 STORAGE_VERSION
```

The current version of the storage.

### STORAGE_SLOT

```solidity
bytes32 STORAGE_SLOT
```

This is keccak256('Fast.storage.History'):

### Data

```solidity
struct Data {
  uint16 version;
  struct LibFastHistory.SupplyProof[] supplyProofs;
  struct LibFastHistory.TransferProof[] transferProofs;
  mapping(address => uint256[]) transferProofInvolvements;
}
```

### SupplyOp

```solidity
enum SupplyOp {
  Mint,
  Burn
}
```

### SupplyProof

```solidity
struct SupplyProof {
  enum LibFastHistory.SupplyOp op;
  uint256 amount;
  uint256 blockNumber;
  string ref;
}
```

### TransferProof

```solidity
struct TransferProof {
  address spender;
  address from;
  address to;
  uint256 amount;
  uint256 blockNumber;
  string ref;
}
```

### data

```solidity
function data() internal pure returns (struct LibFastHistory.Data s)
```

Returns the history storage for the calling FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| s | struct LibFastHistory.Data | a struct pointer for history FAST data storage. |

## LibFastHistory

## LibFastHistory

## LibFastHistory

## LibFastHistory

