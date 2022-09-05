# Solidity API

## LibFastAccess

This library centralises shared functionality between FAST diamonds facets that have to do with ACLs.

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

This is keccak256('Fast.storage.Access'):

### Data

```solidity
struct Data {
  uint16 version;
  struct LibAddressSet.Data governorSet;
  struct LibAddressSet.Data memberSet;
}
```

### data

```solidity
function data() internal pure returns (struct LibFastAccess.Data s)
```

Returns the access storage for the calling FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| s | struct LibFastAccess.Data | a struct pointer for access FAST data storage. |

## LibFastAccess

## LibFastAccess

## LibFastAccess

