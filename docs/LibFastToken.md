# Solidity API

## LibFastToken

This library centralises shared functionality between FAST diamonds facets that have to do with token related logic.

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

This is keccak256('Fast.storage.Token'):

### INSUFFICIENT_TRANSFER_CREDITS_CODE

```solidity
uint8 INSUFFICIENT_TRANSFER_CREDITS_CODE
```

Whenever a transfer requires transfer credits, but there are not enough.

### REQUIRES_FAST_MEMBERSHIP_CODE

```solidity
uint8 REQUIRES_FAST_MEMBERSHIP_CODE
```

Whenever an operation requires an address to be a FAST member.

### REQUIRES_MARKETPLACE_MEMBERSHIP_CODE

```solidity
uint8 REQUIRES_MARKETPLACE_MEMBERSHIP_CODE
```

Whenever an operation requires an address to be a Marketplace member.

### REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT_CODE

```solidity
uint8 REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT_CODE
```

Whenever an operation requires that two addresses are different.

### DEFAULT_TRANSFER_REFERENCE

```solidity
string DEFAULT_TRANSFER_REFERENCE
```

When a transfer is performed without a reference, this is the default one to use.

### Data

```solidity
struct Data {
  uint16 version;
  string name;
  string symbol;
  uint8 decimals;
  uint256 totalSupply;
  uint256 transferCredits;
  mapping(address => uint256) balances;
  mapping(address => mapping(address => uint256)) allowances;
  mapping(address => struct LibAddressSet.Data) allowancesByOwner;
  mapping(address => struct LibAddressSet.Data) allowancesBySpender;
}
```

### data

```solidity
function data() internal pure returns (struct LibFastToken.Data s)
```

Returns the token storage for the calling FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| s | struct LibFastToken.Data | a struct pointer for token FAST data storage. |

