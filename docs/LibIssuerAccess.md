# Solidity API

## LibIssuerAccess

### STORAGE_VERSION

```solidity
uint16 STORAGE_VERSION
```

### STORAGE_SLOT

```solidity
bytes32 STORAGE_SLOT
```

### Data

```solidity
struct Data {
  uint16 version;
  struct LibAddressSet.Data memberSet;
}
```

### data

```solidity
function data() internal pure returns (struct LibIssuerAccess.Data s)
```

