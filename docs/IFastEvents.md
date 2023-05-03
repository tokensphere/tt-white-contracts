# Solidity API

## IFastEvents

An interface allowing to use events within the Diamond pattern without name colisions.

_The idea is that as several facets can emit the same events, we don't want to have to re-declare
the same event several time. This interface is a per-diamond central place for such event declaration._

### Minted

```solidity
event Minted(uint256 amount, string ref, address who)
```

Emited whenever an issuance happens in a FAST.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | is the amount of tokens that have been minted. |
| ref | string | is the reference associated with the minting operation. |
| who | address | is the account from which the minting operation originated. |

### Burnt

```solidity
event Burnt(uint256 amount, string ref, address who)
```

Emited whenever an burning happens in a FAST.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | is the amount of tokens that have been burnt. |
| ref | string | is the reference associated with the burning operation. |
| who | address | is the account from which the burning operation originated. |

### Transfer

```solidity
event Transfer(address from, address to, uint256 value)
```

See `ERC20.Transfer`.

### Approval

```solidity
event Approval(address owner, address spender, uint256 value)
```

See `ERC20.Approval`.

### Disapproval

```solidity
event Disapproval(address owner, address spender, uint256 value)
```

See `ERC20.Disapproval`.

### FastTransfer

```solidity
event FastTransfer(address spender, address from, address to, uint256 value, string ref)
```

As we augmented the ERC20 standard with a few concepts, we emit our custom events
in addition to the ERC20 ones.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| spender | address | is the account who performed the transfer. |
| from | address | is the account from which the tokens will be debited from. |
| to | address | is the account to which the tokens will be credited to. |
| value | uint256 | is the amount of tokens transfered. |
| ref | string | is the optional reference associated with the transfer. |

### DistributionDeployed

```solidity
event DistributionDeployed(contract Distribution distribution)
```

Distribution related events.

### DistributionRemoved

```solidity
event DistributionRemoved(contract Distribution distribution)
```

### CrowdfundDeployed

```solidity
event CrowdfundDeployed(contract Crowdfund crowdfund)
```

Crowdfund related events.

### CrowdfundRemoved

```solidity
event CrowdfundRemoved(contract Crowdfund crowdfund)
```

### DetailsChanged

```solidity
event DetailsChanged(bool transfersDisabled, uint256 memberCount, uint256 governorCount, uint256 totalSupply, uint256 reserveBalance)
```

This is an event that is fired whenever any of some of the FAST parameters
change, so that the frontend can react to it and refresh the general header
for that fast as well as the baseball cards in the FASTs list.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| transfersDisabled | bool | marks whether or not transfers are disabled by an issuer member at FAST level. |
| memberCount | uint256 | is the number of members in the FAST. |
| governorCount | uint256 | is the number of governors in the FAST. |
| totalSupply | uint256 | is the amount of tokens in circulation in the FAST. |
| reserveBalance | uint256 | is the balance of the zero-address (aka reserve) for the FAST. |

