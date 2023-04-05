// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


interface ICustomErrors {
  error AlreadyInitialized();
  error InternalMethod();
  error RequiresDiamondOwnership(address who);
  error RequiresFastContractCaller();

  error RequiresTransfersEnabled();
  error RequiresIssuerMembership(address who);
  error RequiresMarketplaceMembership(address who);
  error RequiresMarketplaceActiveMembership(address who);
  error RequiresMarketplaceDeactivatedMember(address who);

  error RequiresValidTokenHolder(address who);
  error RequiresFastGovernorship(address who);
  error RequiresFastMembership(address who);
  error RequiresNoFastMemberships(address who);

  error RequiresOwner(address who);

  error InsufficientFunds(uint256 missing);

  error DuplicateEntry();
  error NonExistentEntry();
  error UnsupportedOperation();
  error CannotSelfRemove(address who);
  error ReentrancyError();

  error RequiresContinuousSupply();
  error RequiresPositiveBalance(address holder);
  error RequiresDifferentSenderAndRecipient(address a);
}
