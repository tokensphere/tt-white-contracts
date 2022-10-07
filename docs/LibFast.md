# Solidity API

## LibFast

Top-level shared functionality for FAST diamonds.

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

This is keccak256('Fast.storage'):

### Data

```solidity
struct Data {
  uint16 version;
  address issuer;
  address marketplace;
  bool hasFixedSupply;
  bool isSemiPublic;
}
```

### data

```solidity
function data() internal pure returns (struct LibFast.Data s)
```

Returns the top-level storage for the calling FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| s | struct LibFast.Data | a struct pointer for top-level FAST data storage. |

