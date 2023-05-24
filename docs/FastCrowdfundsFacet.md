# Solidity API

## FastCrowdfundsFacet

The Fast Crowdfunds facet is in charge of deploying and keeping track of crowdfunds.

### createCrowdfund

```solidity
function createCrowdfund(contract IERC20 token, address beneficiary, string ref) external
```

Creates a crowdfund contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | contract IERC20 | is the address of the ERC20 token that should be collected. |
| beneficiary | address |  |
| ref | string |  |

### removeCrowdfund

```solidity
function removeCrowdfund(contract Crowdfund crowdfund) public
```

### crowdfundCount

```solidity
function crowdfundCount() external view returns (uint256)
```

Retrieves the number of crowdfunds ever deployed for this FAST.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | An `uint256` for the count. |

### paginateCrowdfunds

```solidity
function paginateCrowdfunds(uint256 index, uint256 perPage) external view returns (address[], uint256)
```

Queries pages of crowdfunds based on a start index and a page size.

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

