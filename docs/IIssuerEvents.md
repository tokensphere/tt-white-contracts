# Solidity API

## IIssuerEvents

### FastRegistered

```solidity
event FastRegistered(address fast)
```

Emited when a new FAST is registered.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fast | address | The address of the newly registered FAST diamond. |

### FastUnregistered

```solidity
event FastUnregistered(address fast)
```

Emited when a FAST is removed from the Issuer contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fast | address | The address of the unregistered FAST. |

### MemberAdded

```solidity
event MemberAdded(address member)
```

### MemberRemoved

```solidity
event MemberRemoved(address member)
```

### GovernorshipRemoved

```solidity
event GovernorshipRemoved(address fast, address governor)
```

### GovernorshipAdded

```solidity
event GovernorshipAdded(address fast, address governor)
```

