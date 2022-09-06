// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


interface ICustomErrors {
  error AlreadyInitialized();
  error InternalMethod();
  error RequiresDiamondOwnership();
  error RequiresFastContractCaller();

  error RequiresIssuerMembership(address who);
  error RequiresMarketplaceMembership(address who);
  error RequiresMarketplaceActiveMember(address who);
  error RequiresMarketplaceDeactivatedMember(address who);

  error RequiresFastGovernorship(address who);
  error RequiresFastMembership(address who);
  error RequiresNoFastMemberships(address who);

  error DuplicateEntry();
  error UnsupportedOperation();
  error CannotSelfRemove(address who);

  error RequiresContinuousSupply();
  error RequiresPositiveBalance(address holder);
  error RequiresDifferentSenderAndRecipient(address a, address b);
}
