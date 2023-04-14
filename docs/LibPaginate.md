# Solidity API

## LibPaginate

### addresses

```solidity
function addresses(address[] collection, uint256 cursor, uint256 perPage) internal view returns (address[], uint256)
```

### uint256s

```solidity
function uint256s(uint256[] collection, uint256 cursor, uint256 perPage) internal view returns (uint256[], uint256)
```

### supplyProofs

```solidity
function supplyProofs(struct LibFastHistory.SupplyProof[] collection, uint256 cursor, uint256 perPage) internal view returns (struct LibFastHistory.SupplyProof[], uint256)
```

### transferProofs

```solidity
function transferProofs(struct LibFastHistory.TransferProof[] collection, uint256 cursor, uint256 perPage) internal view returns (struct LibFastHistory.TransferProof[], uint256)
```

