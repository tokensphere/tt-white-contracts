# Solidity API

## LibHasAutomatons

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
  struct LibAddressSet.Data automatonSet;
  mapping(address => uint32) automatonPrivileges;
}
```

### data

```solidity
function data() internal pure returns (struct LibHasAutomatons.Data s)
```

