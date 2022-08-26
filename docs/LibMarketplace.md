# Solidity API

## LibMarketplace

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
  address issuer;
}
```

### data

```solidity
function data() internal pure returns (struct LibMarketplace.Data s)
```

