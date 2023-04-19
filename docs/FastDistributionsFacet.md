# Solidity API

## FastDistributionsFacet

The Fast Distributions facet is in charge of deploying and keeping track of distributions.

### TokenContractError

```solidity
error TokenContractError()
```

Happens when a call to the ERC20 token contract fails.

### InsufficientFunds

```solidity
error InsufficientFunds(uint256 amount)
```

Happens when there are insufficient funds somewhere.

### createDistribution

```solidity
function createDistribution(contract IERC20 token, uint256 total, uint256 blockLatch) external
```

Creates a distribution contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | contract IERC20 | is the address of the ERC20 token that should be distributed. |
| total | uint256 | is the amount of ERC20 tokens to distribute. |
| blockLatch | uint256 | is the block to consider the historical point of truth to calculate the proceeds. |

### distributionCount

```solidity
function distributionCount() external view returns (uint256)
```

Retrieves the number of distributions ever deployed for this FAST.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An `uint256` for the count. |

### paginateDistributions

```solidity
function paginateDistributions(uint256 index, uint256 perPage) external view returns (address[], uint256)
```

Queries pages of distributions based on a start index and a page size.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | is the offset at which the pagination operation should start. |
| perPage | uint256 | is how many items should be returned. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | An `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page. |
| [1] | uint256 |  |

