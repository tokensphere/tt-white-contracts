# Solidity API

## IssuerInitFacet

The marketplace contract is in charge of keeping track of marketplace members and has logic
related to trading.
It requires an Issuer contract instance at construct-time, as it relies on Issuer membership
to permission governance functions.

### MemberAdded

```solidity
event MemberAdded(address member)
```

Events.

### InitializerParams

```solidity
struct InitializerParams {
  address member;
}
```

### initialize

```solidity
function initialize(struct IssuerInitFacet.InitializerParams params) external
```

