# Solidity API

## IDiamondLoupe

### Facet

```solidity
struct Facet {
  address facetAddress;
  bytes4[] functionSelectors;
}
```

### facets

```solidity
function facets() external view returns (struct IDiamondLoupe.Facet[] facets_)
```

Gets all facet addresses and their four byte function selectors.

| Name | Type | Description |
| ---- | ---- | ----------- |
| facets_ | struct IDiamondLoupe.Facet[] | All facets and their registered selectors. |

### facetFunctionSelectors

```solidity
function facetFunctionSelectors(address _facet) external view returns (bytes4[] facetFunctionSelectors_)
```

Gets all the function selectors supported by a specific facet.

| Name | Type | Description |
| ---- | ---- | ----------- |
| _facet | address | The facet address. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| facetFunctionSelectors_ | bytes4[] | is the list of selectors for the given function. |

### facetAddresses

```solidity
function facetAddresses() external view returns (address[] facetAddresses_)
```

Get all the facet addresses used by a diamond.

| Name | Type | Description |
| ---- | ---- | ----------- |
| facetAddresses_ | address[] | are all facet addresses registered with this diamond. |

### facetAddress

```solidity
function facetAddress(bytes4 _functionSelector) external view returns (address facetAddress_)
```

Gets the facet that supports the given selector.
If facet is not found return address(0).

| Name | Type | Description |
| ---- | ---- | ----------- |
| _functionSelector | bytes4 | The function selector. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| facetAddress_ | address | The facet address. |

## IDiamondLoupe

