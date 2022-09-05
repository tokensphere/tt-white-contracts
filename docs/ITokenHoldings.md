# Solidity API

## ITokenHoldings

_Interface to wrap FAST holdings functionality._

### holdingUpdated

```solidity
function holdingUpdated(address account, address fast) external
```

_Callback for a FAST token._

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account to add the FAST address to. |
| fast | address | The address of the FAST. |

### holdings

```solidity
function holdings(address account) external view returns (address[])
```

_Returns the FASTs an account holds._

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account to query the FAST holdings of. |

## ITokenHoldings

## ITokenHoldings

## ITokenHoldings

