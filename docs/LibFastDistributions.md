# Solidity API

## LibFastDistributions

### STORAGE_VERSION

```solidity
uint16 STORAGE_VERSION
```

The current version of the storage.

### STORAGE_SLOT

```solidity
bytes32 STORAGE_SLOT
```

This is keccak256('Fast.storage.Distributions'):

### Data

```solidity
struct Data {
  uint16 version;
  struct LibAddressSet.Data distributionSet;
}
```

### data

```solidity
function data() internal pure returns (struct LibFastDistributions.Data s)
```

Returns the access storage for the calling FAST.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| s | struct LibFastDistributions.Data | a struct pointer for access FAST data storage. |

