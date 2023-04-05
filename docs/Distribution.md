# Solidity API

## Distribution

This contract allows for dividends or proceeds to be distributted amongst
a list of beneficiaries. It has a lifecycle that can be described based on the
following steps (or phases):
- Funding, during which the sum to be distributed has to be credited to this contract.
- FeeSetup, during which the oracle will define the fee to be paid upon distribution.
- BeneficiariesSetup, during which the oracle can setup the beneficiaries.
- Withdrawal, during which each beneficiary can withdraw their proceeds.
- Terminated, during which nothing is possible.

### Phase

```solidity
enum Phase {
  Creation,
  FeeSetup,
  BeneficiariesSetup,
  Withdrawal,
  Terminated
}
```

### Advance

```solidity
event Advance(enum Distribution.Phase phase)
```

Emited whenever the internal phase of this distribution changes.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| phase | enum Distribution.Phase | The new phase of this contract. |

### BeneficiaryAdded

```solidity
event BeneficiaryAdded(address beneficiary, uint256 amount)
```

Emited whenever a beneficiary is added to the distribution list.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| beneficiary | address | is the address of the beneficiary who was added. |
| amount | uint256 | is the amount in native target token that is owed to the beneficiary. |

### BeneficiaryRemoved

```solidity
event BeneficiaryRemoved(address beneficiary)
```

Emited whenever a beneficiary is removed from the distribution list.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| beneficiary | address | is the address of the beneficiary who was removed. |

### Withdrawal

```solidity
event Withdrawal(address caller, address beneficiary, uint256 amount)
```

Emited whenever a beneficiary withdraws their owings.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | is the address who ordered the withdrawal. |
| beneficiary | address | is the address of the beneficiary who performed the withdrawal. |
| amount | uint256 | is the amount that was withdrawn. |

### Params

```solidity
struct Params {
  address distributor;
  address issuer;
  address fast;
  contract IERC20 token;
  uint256 blockLatch;
  uint256 total;
}
```

### VERSION

```solidity
uint16 VERSION
```

A version identifier for us to track what's deployed.

### params

```solidity
struct Distribution.Params params
```

The initial params, as passed to the contract's constructor.

### phase

```solidity
enum Distribution.Phase phase
```

The phase at which the distribution is at.

### creationBlock

```solidity
uint256 creationBlock
```

When was the distribution created.

### fee

```solidity
uint256 fee
```

How much the fee that will be distributed to `issuer` is.

### available

```solidity
uint256 available
```

How much is left for distribution.

### beneficiaries

```solidity
struct LibAddressSet.Data beneficiaries
```

The list of beneficiaries known to the system.

### owings

```solidity
mapping(address => uint256) owings
```

How much was set asside for a particular beneficiary.

### withdrawn

```solidity
mapping(address => bool) withdrawn
```

Whether or not a benificiary has withdrawn yet.

### constructor

```solidity
constructor(struct Distribution.Params p) public
```

Constructs a new `Distribution` contracts.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| p | struct Distribution.Params | is a `Params` structure. |

### advance

```solidity
function advance() public
```

Advances to the next phase when possible, reverts otherwise.
Note that since this method calls the `token` contract, it **must be
protected against reentrancy**.

### setFee

```solidity
function setFee(uint256 _fee) external
```

Sets the fee to be taken upon distribution. Only available during the
`Phase.FeeSetup` phase, throws otherwise. This method automatically advances the
phase to `Phase.BeneficiariesSetup`, so it can only be called once.
Note that only a manager (issuer or automaton with the correct privileges) can
call this method.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fee | uint256 | is the amount that the `issuer` will receive. |

### addBeneficiaries

```solidity
function addBeneficiaries(address[] _beneficiaries, uint256[] _amounts) public
```

Adds beneficiaries and amounts to the distribution list. Both `_beneficiaries`
and `_amounts` arrays must be of the same size, or the method will revert.
This method is only available during the `Phase.BeneficiariesSetup` phase.
During execution, this method will make sure that the cumulated amounts for all
beneficiaries doesn't exceed the `total` amount available for distribution, or it
will simply throw.
Note that adding the same beneficiary twice will throw.
Note that only a manager (issuer or automaton with the correct privileges) can
call this method.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _beneficiaries | address[] | is the list of beneficiaries to add. |
| _amounts | uint256[] | is the list of amounts respective to each beneficiary. |

### removeBeneficiaries

```solidity
function removeBeneficiaries(address[] _beneficiaries) external
```

Removes a list of beneficiaries from the distribution list.
Note that removing a non-existent beneficiary will simply throw.
During execution, this method will increase the amount available for
distribution automatically.
Note that only a manager (issuer or automaton with the correct privileges) can
call this method.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _beneficiaries | address[] | is the list of addresses to remove. |

### paginateBeneficiaries

```solidity
function paginateBeneficiaries(uint256 index, uint256 perPage) external view returns (address[], uint256)
```

Queries pages of beneficiaries based on a start index and a page size.
Note that it is possible to query owings for each of these beneficiaries by
utilizing the `owings` and `withdrawn` public function.

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

### withdraw

```solidity
function withdraw(address beneficiary) public
```

This function allows any beneficiary to withdraw what they are owed. This
method can only be called during the `Phase.Withdrawal` phase.
Note that this function is protected from reentrancy as it operates on the `token`
methods.

### terminate

```solidity
function terminate() public
```

A panic function that can only be called by the distributor of the distribution.
Upon calling this method, the contract will simply send back any funds still
available to it and set its internal state to a termination one.
Note that since this method calls the `token` contract, it **must be
protected against reentrancy**.

### requireManagerCaller

```solidity
function requireManagerCaller() internal view
```

### requireDistributor

```solidity
function requireDistributor() internal view
```

### onlyManager

```solidity
modifier onlyManager()
```

### onlyDuring

```solidity
modifier onlyDuring(enum Distribution.Phase _phase)
```

