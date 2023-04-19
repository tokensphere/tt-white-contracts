# Solidity API

## FastFrontendFacet

A facet dedicated to view / UI only methods. This facet should never hold any method that
is not either `pure` or `view`, except to emit events.

### Details

```solidity
struct Details {
  address addr;
  string name;
  string symbol;
  uint8 decimals;
  uint256 totalSupply;
  bool isSemiPublic;
  bool hasFixedSupply;
  bool transfersDisabled;
  uint256 reserveBalance;
  uint256 memberCount;
  uint256 governorCount;
}
```

### GovernorDetails

```solidity
struct GovernorDetails {
  address addr;
  bool isMember;
}
```

### MemberDetails

```solidity
struct MemberDetails {
  address addr;
  uint256 balance;
  bool isGovernor;
}
```

### emitDetailsChanged

```solidity
function emitDetailsChanged() external
```

Called by diamond facets, signals that FAST details may have changed.

Business logic:
- Modifiers:
  - Requires the caller to be another facet of the diamond.
Emits `DetailsChanged`, see `IFastEvents.DetailsChanged`

### details

```solidity
function details() public view returns (struct FastFrontendFacet.Details)
```

Gets the details of a FAST.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct FastFrontendFacet.Details | The details for the current FAST, see `Details`. |

### detailedGovernor

```solidity
function detailedGovernor(address governor) public view returns (struct FastFrontendFacet.GovernorDetails)
```

Gets detailed governor details.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct FastFrontendFacet.GovernorDetails | GovernorDetails See: `GovernorDetails`. |

### paginateDetailedGovernors

```solidity
function paginateDetailedGovernors(uint256 index, uint256 perPage) external view returns (struct FastFrontendFacet.GovernorDetails[], uint256)
```

### detailedMember

```solidity
function detailedMember(address member) public view returns (struct FastFrontendFacet.MemberDetails)
```

Gets detailed member details.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct FastFrontendFacet.MemberDetails | A FAST member's details, see `MemberDetails`. |

### paginateDetailedMembers

```solidity
function paginateDetailedMembers(uint256 index, uint256 perPage) external view returns (struct FastFrontendFacet.MemberDetails[], uint256)
```

