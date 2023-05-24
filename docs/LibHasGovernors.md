# Solidity API

## LibHasGovernors

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
  struct LibAddressSet.Data governorSet;
}
```

### data

```solidity
function data() internal pure returns (struct LibHasGovernors.Data s)
```

