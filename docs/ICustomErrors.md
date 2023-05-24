# Solidity API

## ICustomErrors

### AlreadyInitialized

```solidity
error AlreadyInitialized()
```

### CannotSelfRemove

```solidity
error CannotSelfRemove(address who)
```

### DuplicateEntry

```solidity
error DuplicateEntry()
```

### InconsistentParameter

```solidity
error InconsistentParameter(string param)
```

### InsufficientFunds

```solidity
error InsufficientFunds(uint256 amount)
```

### InternalMethod

```solidity
error InternalMethod()
```

### InvalidPhase

```solidity
error InvalidPhase()
```

### NonExistentEntry

```solidity
error NonExistentEntry()
```

### Overfunded

```solidity
error Overfunded(uint256 amount)
```

### ReentrancyError

```solidity
error ReentrancyError()
```

### RequiresAutomatonsManager

```solidity
error RequiresAutomatonsManager(address who)
```

### RequiresContinuousSupply

```solidity
error RequiresContinuousSupply()
```

### RequiresDiamondOwnership

```solidity
error RequiresDiamondOwnership(address who)
```

### RequiresDifferentSenderAndRecipient

```solidity
error RequiresDifferentSenderAndRecipient(address a)
```

### RequiresFastCaller

```solidity
error RequiresFastCaller()
```

### RequiresFastContractCaller

```solidity
error RequiresFastContractCaller()
```

### RequiresFastGovernorship

```solidity
error RequiresFastGovernorship(address who)
```

### RequiresFastMemberCaller

```solidity
error RequiresFastMemberCaller()
```

### RequiresFastMembership

```solidity
error RequiresFastMembership(address who)
```

### RequiresGovernorsManager

```solidity
error RequiresGovernorsManager(address who)
```

### RequiresIssuerMemberCaller

```solidity
error RequiresIssuerMemberCaller()
```

### RequiresIssuerMembership

```solidity
error RequiresIssuerMembership(address who)
```

### RequiresManagerCaller

```solidity
error RequiresManagerCaller()
```

### RequiresMarketplaceActiveMembership

```solidity
error RequiresMarketplaceActiveMembership(address who)
```

### RequiresMarketplaceDeactivatedMember

```solidity
error RequiresMarketplaceDeactivatedMember(address who)
```

### RequiresMarketplaceMembership

```solidity
error RequiresMarketplaceMembership(address who)
```

### RequiresMembersManager

```solidity
error RequiresMembersManager(address who)
```

### RequiresNoFastMemberships

```solidity
error RequiresNoFastMemberships(address who)
```

### RequiresOwner

```solidity
error RequiresOwner(address who)
```

### RequiresPositiveBalance

```solidity
error RequiresPositiveBalance(address holder)
```

### RequiresTransfersEnabled

```solidity
error RequiresTransfersEnabled()
```

### RequiresValidGovernor

```solidity
error RequiresValidGovernor(address who)
```

### RequiresValidMember

```solidity
error RequiresValidMember(address who)
```

### RequiresValidTokenHolder

```solidity
error RequiresValidTokenHolder(address who)
```

### TokenContractError

```solidity
error TokenContractError()
```

### UnknownBeneficiary

```solidity
error UnknownBeneficiary(address who)
```

### UnknownPledger

```solidity
error UnknownPledger(address who)
```

### UnsupportedOperation

```solidity
error UnsupportedOperation()
```

