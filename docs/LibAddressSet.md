# Solidity API

## LibAddressSet

### Data

```solidity
struct Data {
  mapping(address => uint256) indices;
  address[] values;
}
```

### add

```solidity
function add(struct LibAddressSet.Data d, address key, bool noThrow) internal
```

Adds an item into the storage set. If the address already exists in the set, the method reverts.

| Name | Type | Description |
| ---- | ---- | ----------- |
| d | struct LibAddressSet.Data | is the internal data storage to use. |
| key | address | is the address to be added. |
| noThrow | bool |  |

### remove

```solidity
function remove(struct LibAddressSet.Data d, address key, bool noThrow) internal
```

Removes an item from the storage set. If the address does not exist in the set, the method reverts.

| Name | Type | Description |
| ---- | ---- | ----------- |
| d | struct LibAddressSet.Data | is the internal data storage to use. |
| key | address | is the address to be removed. |
| noThrow | bool |  |

### contains

```solidity
function contains(struct LibAddressSet.Data d, address key) internal view returns (bool)
```

Tests whether or not a given item already exists in the set.

| Name | Type | Description |
| ---- | ---- | ----------- |
| d | struct LibAddressSet.Data | is the internal data storage to use. |
| key | address | is the address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | a boolean. |

## LibAddressSet

### Data

```solidity
struct Data {
  mapping(address => uint256) indices;
  address[] values;
}
```

### add

```solidity
function add(struct LibAddressSet.Data d, address key, bool noThrow) internal
```

Adds an item into the storage set. If the address already exists in the set, the method reverts.

| Name | Type | Description |
| ---- | ---- | ----------- |
| d | struct LibAddressSet.Data | is the internal data storage to use. |
| key | address | is the address to be added. |
| noThrow | bool |  |

### remove

```solidity
function remove(struct LibAddressSet.Data d, address key, bool noThrow) internal
```

Removes an item from the storage set. If the address does not exist in the set, the method reverts.

| Name | Type | Description |
| ---- | ---- | ----------- |
| d | struct LibAddressSet.Data | is the internal data storage to use. |
| key | address | is the address to be removed. |
| noThrow | bool |  |

### contains

```solidity
function contains(struct LibAddressSet.Data d, address key) internal view returns (bool)
```

Tests whether or not a given item already exists in the set.

| Name | Type | Description |
| ---- | ---- | ----------- |
| d | struct LibAddressSet.Data | is the internal data storage to use. |
| key | address | is the address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | a boolean. |

## LibAddressSet

### Data

```solidity
struct Data {
  mapping(address => uint256) indices;
  address[] values;
}
```

### add

```solidity
function add(struct LibAddressSet.Data d, address key, bool noThrow) internal
```

Adds an item into the storage set. If the address already exists in the set, the method reverts.

| Name | Type | Description |
| ---- | ---- | ----------- |
| d | struct LibAddressSet.Data | is the internal data storage to use. |
| key | address | is the address to be added. |
| noThrow | bool |  |

### remove

```solidity
function remove(struct LibAddressSet.Data d, address key, bool noThrow) internal
```

Removes an item from the storage set. If the address does not exist in the set, the method reverts.

| Name | Type | Description |
| ---- | ---- | ----------- |
| d | struct LibAddressSet.Data | is the internal data storage to use. |
| key | address | is the address to be removed. |
| noThrow | bool |  |

### contains

```solidity
function contains(struct LibAddressSet.Data d, address key) internal view returns (bool)
```

Tests whether or not a given item already exists in the set.

| Name | Type | Description |
| ---- | ---- | ----------- |
| d | struct LibAddressSet.Data | is the internal data storage to use. |
| key | address | is the address to test. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | a boolean. |

## LibAddressSet

