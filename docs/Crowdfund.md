# Solidity API

## Crowdfund

This contract is used to manage a crowdfunding campaign.

### InvalidPhase

```solidity
error InvalidPhase()
```

### UnsupportedOperation

```solidity
error UnsupportedOperation()
```

### InconsistentParameters

```solidity
error InconsistentParameters()
```

### RequiresFastMembership

```solidity
error RequiresFastMembership(address who)
```

### RequiresManagerCaller

```solidity
error RequiresManagerCaller()
```

### TokenContractError

```solidity
error TokenContractError()
```

### InsufficientFunds

```solidity
error InsufficientFunds(uint256 amount)
```

### Advance

```solidity
event Advance(enum Crowdfund.Phase phase)
```

Emited whenever the internal phase of this crowdfund changes.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| phase | enum Crowdfund.Phase | The new phase of this contract. |

### Pledge

```solidity
event Pledge(address pledger, uint256 amount)
```

Emited whenever a plege is made.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| pledger | address | The address of the pledger. |
| amount | uint256 | The amount of tokens pledged. |

### Terminated

```solidity
event Terminated(bool success)
```

Emited when the crowdfunding is terminated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Whether the crowdfunding was successful or not. |

### Phase

```solidity
enum Phase {
  Setup,
  Funding,
  Success,
  Failure
}
```

### Params

```solidity
struct Params {
  address owner;
  address issuer;
  address fast;
  address beneficiary;
  contract IERC20 token;
}
```

### VERSION

```solidity
uint16 VERSION
```

A version identifier for us to track what's deployed.

### params

```solidity
struct Crowdfund.Params params
```

The initial params, as passed to the contract's constructor.

### phase

```solidity
enum Crowdfund.Phase phase
```

The phase at which the crowdfunding is at.

### creationBlock

```solidity
uint256 creationBlock
```

When was the distribution created.

### basisPointsFee

```solidity
uint256 basisPointsFee
```

The fee expressed in basis points - eg ten thousandths.

### collected

```solidity
uint256 collected
```

How much was collected so far.

### pledgerSet

```solidity
struct LibAddressSet.Data pledgerSet
```

The set of addresses that have pledged to this crowdfund.

### pledges

```solidity
mapping(address => uint256) pledges
```

The mapping of pledgers to their pledged amounts.

### constructor

```solidity
constructor(struct Crowdfund.Params p) public
```

The constructor for this contract.
Note that the constructor places the contract into the setup phase.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| p | struct Crowdfund.Params | The parameters to be passed to this contract's constructor. |

### feeAmount

```solidity
function feeAmount() public view returns (uint256)
```

_Given a total and a fee in basis points, returns the fee amount rounded up._

### advanceToFunding

```solidity
function advanceToFunding(uint256 _basisPointsFee) external
```

Advances the campaign to the funding phase.
Note that this method is only available during the setup phase.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _basisPointsFee | uint256 | The fee expressed in basis points - eg ten thousandths. |

### pledge

```solidity
function pledge(uint256 amount) public
```

Allows a pledger to pledge tokens to this crowdfund.
Note that this method is only available during the funding phase.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of tokens to pledge. |

### pledgerCount

```solidity
function pledgerCount() external view returns (uint256)
```

Queries the number of members.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An `uint256`. |

### paginatePledgers

```solidity
function paginatePledgers(uint256 index, uint256 perPage) external view returns (address[], uint256)
```

Queries pages of pledgers based on a start index and a page size.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | is the offset at which the pagination operation should start. |
| perPage | uint256 | is how many items should be returned. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page. |
| [1] | uint256 |  |

### terminate

```solidity
function terminate(bool success) public
```

Allows an issuer member to terminate the crowdfunding given a success flag.
Note that this method is available during any phase and can be used as a panic
button to terminate the crowdfunding prematurely.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | Whether the crowdfunding was successful or not. |

### withdraw

```solidity
function withdraw(address pledger) public
```

Allows a pledger to withdraw their funds if the crowdfunding failed.
Note that this method is only available during the failure phase.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| pledger | address | The address of the pledger to withdraw funds for. |

### isFastMember

```solidity
function isFastMember(address who) internal view returns (bool)
```

_Checks whether the given address is a member of the FAST contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| who | address | The address to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A `bool` indicating whether the address is a member of the FAST contract. |

### onlyDuring

```solidity
modifier onlyDuring(enum Crowdfund.Phase _phase)
```

### onlyFastMember

```solidity
modifier onlyFastMember()
```

### onlyManager

```solidity
modifier onlyManager()
```

