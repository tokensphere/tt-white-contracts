# Solidity API

## FastInitFacet

NotAlthough this contract doesn't explicitelly inherit from IERC173, ERC165, IDiamondLoupe etc, all
methods are in fact implemented by the underlaying Diamond proxy. It is therefore safe to
perform casts directly on the current contract address into these interfaces.

### MemberAdded

```solidity
event MemberAdded(address member)
```

Events.

### GovernorAdded

```solidity
event GovernorAdded(address governor)
```

### InitializerParams

```solidity
struct InitializerParams {
  address issuer;
  address marketplace;
  address payable governor;
  string name;
  string symbol;
  uint8 decimals;
  bool hasFixedSupply;
  bool isSemiPublic;
}
```

### initialize

```solidity
function initialize(struct FastInitFacet.InitializerParams params) external
```

