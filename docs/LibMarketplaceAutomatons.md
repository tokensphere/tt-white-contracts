# Solidity API

## LibMarketplaceAutomatons

### STORAGE_VERSION

```solidity
uint16 STORAGE_VERSION
```

### STORAGE_SLOT

```solidity
bytes32 STORAGE_SLOT
```

### PRIVILEGE_ADD_MEMBER

```solidity
uint256 PRIVILEGE_ADD_MEMBER
```

### PRIVILEGE_REMOVE_MEMBER

```solidity
uint256 PRIVILEGE_REMOVE_MEMBER
```

### PRIVILEGE_ACTIVATE_MEMBER

```solidity
uint256 PRIVILEGE_ACTIVATE_MEMBER
```

### PRIVILEGE_DEACTIVATE_MEMBER

```solidity
uint256 PRIVILEGE_DEACTIVATE_MEMBER
```

### Privileges

```solidity
struct Privileges {
  bool canAddMember;
  bool canRemoveMember;
  bool canActivateMember;
  bool canDeactivateMember;
}
```

### Data

```solidity
struct Data {
  uint16 version;
  struct LibAddressSet.Data automatonSet;
  mapping(address => uint256) automatonPrivileges;
}
```

### data

```solidity
function data() internal pure returns (struct LibMarketplaceAutomatons.Data s)
```

## LibMarketplaceAutomatons

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
  mapping(address => uint256) automatonPrivileges;
}
```

### data

```solidity
function data() internal pure returns (struct LibMarketplaceAutomatons.Data s)
```

