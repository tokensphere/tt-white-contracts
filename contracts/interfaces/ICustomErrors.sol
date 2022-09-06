// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


interface ICustomErrors {
  error AlreadyInitialized();
  error InternalMethod();
  error RequiresDiamondOwnership();
  error RequiresFastContractCaller();

  error RequiresIssuerMembership();
  error RequiresMarketplaceMembership();
  error RequiresMarketplaceActiveMember();
  error RequiresMarketplaceDeactivatedMember();

  error RequiresFastGovernorship();
  error RequiresFastMembership();
  error RequiresNoFastMemberships();

  error DuplicateEntry(string symbol);
  error UnsupportedOperation();
  error CannotSelfRemove();

  error RequiresContinuousSupply();
  error InsufficientFunds();
  error InsufficientAllowance();
  error InsufficientTransferCredits();
  error RequiresDifferentSenderAndRecipient();
  error UnknownRestrictionCode();
}