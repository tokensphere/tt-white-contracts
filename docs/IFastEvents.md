# Solidity API

## IFastEvents

An interface allowing to use events within the Diamond pattern without name colisions.

_The idea is that as several facets can emit the same events, we don't want to have to re-declare
the same event several time. This interface is a per-diamond central place for such event declaration._

### MemberAdded

```solidity
event MemberAdded(address member)
```

Emited when a member is added to the implementing contract.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address of the added member. |

### MemberRemoved

```solidity
event MemberRemoved(address member)
```

Emited when a member is removed to the implementing contract.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address of the removed member. |

### GovernorAdded

```solidity
event GovernorAdded(address governor)
```

Emited when a governor is added to the implementing contract.

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address of the added governor. |

### GovernorRemoved

```solidity
event GovernorRemoved(address governor)
```

Emited when a governor is removed to the implementing contract.

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address of the removed member. |

### Minted

```solidity
event Minted(uint256 amount, string ref)
```

Emited whenever an issuance happens in a FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | is the amount of tokens that have been minted. |
| ref | string | is the reference associated with the minting operation. |

### Burnt

```solidity
event Burnt(uint256 amount, string ref)
```

Emited whenever an burning happens in a FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | is the amount of tokens that have been burnt. |
| ref | string | is the reference associated with the burning operation. |

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

### DetailsChanged

```solidity
event DetailsChanged(bool transfersDisabled, uint256 memberCount, uint256 governorCount, uint256 totalSupply, uint256 reserveBalance, uint256 ethBalance)
```

This is an event that is fired whenever any of some of the FAST parameters
change, so that the frontend can react to it and refresh the general header
for that fast as well as the baseball cards in the FASTs list.

| Name | Type | Description |
| ---- | ---- | ----------- |
| transfersDisabled | bool | marks whether or not transfers are disabled by an issuer member at FAST level. |
| memberCount | uint256 | is the number of members in the FAST. |
| governorCount | uint256 | is the number of governors in the FAST. |
| totalSupply | uint256 | is the amount of tokens in circulation in the FAST. |
| reserveBalance | uint256 | is the balance of the zero-address (aka reserve) for the FAST. |
| ethBalance | uint256 | is the amount of Eth locked in the FAST. |

## IFastEvents

## IFastEvents

## IFastEvents

## IFastEvents

An interface allowing to use events within the Diamond pattern without name colisions.

_The idea is that as several facets can emit the same events, we don't want to have to re-declare
the same event several time. This interface is a per-diamond central place for such event declaration._

### MemberAdded

```solidity
event MemberAdded(address member)
```

Emited when a member is added to the implementing contract.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address of the added member. |

### MemberRemoved

```solidity
event MemberRemoved(address member)
```

Emited when a member is removed to the implementing contract.

| Name | Type | Description |
| ---- | ---- | ----------- |
| member | address | is the address of the removed member. |

### GovernorAdded

```solidity
event GovernorAdded(address governor)
```

Emited when a governor is added to the implementing contract.

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address of the added governor. |

### GovernorRemoved

```solidity
event GovernorRemoved(address governor)
```

Emited when a governor is removed to the implementing contract.

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | is the address of the removed member. |

### Minted

```solidity
event Minted(uint256 amount, string ref)
```

Emited whenever an issuance happens in a FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | is the amount of tokens that have been minted. |
| ref | string | is the reference associated with the minting operation. |

### Burnt

```solidity
event Burnt(uint256 amount, string ref)
```

Emited whenever an burning happens in a FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | is the amount of tokens that have been burnt. |
| ref | string | is the reference associated with the burning operation. |

### TransferCreditsAdded

```solidity
event TransferCreditsAdded(address issuerMember, uint256 amount)
```

Emited whenever transfer credits increase inside a FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| issuerMember | address | is the address of the Issuer member who performed the operation. |
| amount | uint256 | is the number of issued transfer credits. |

### TransferCreditsDrained

```solidity
event TransferCreditsDrained(address issuerMember, uint256 amount)
```

Emited whenever transfer credits are drained inside a FAST.

| Name | Type | Description |
| ---- | ---- | ----------- |
| issuerMember | address | is the address of the Issuer member who performed the operation. |
| amount | uint256 | is the number of drained transfer credits. |

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

### DetailsChanged

```solidity
event DetailsChanged(uint256 memberCount, uint256 governorCount, uint256 totalSupply, uint256 transferCredits, uint256 reserveBalance, uint256 ethBalance)
```

This is an event that is fired whenever any of some of the FAST parameters
change, so that the frontend can react to it and refresh the general header
for that fast as well as the baseball cards in the FASTs list.

| Name | Type | Description |
| ---- | ---- | ----------- |
| memberCount | uint256 | is the number of members in the FAST. |
| governorCount | uint256 | is the number of governors in the FAST. |
| totalSupply | uint256 | is the amount of tokens in circulation in the FAST. |
| transferCredits | uint256 | represents how many transfer credits are available inside the FAST. |
| reserveBalance | uint256 | is the balance of the zero-address (aka reserve) for the FAST. |
| ethBalance | uint256 | is the amount of Eth locked in the FAST. |

