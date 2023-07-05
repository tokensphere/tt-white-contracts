// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface ICustomErrors {
  error AlreadyInitialized();
  error CannotSelfRemove(address who);
  error DuplicateEntry();
  error InconsistentParameter(string param);
  error InsufficientFunds(uint256 amount);
  error InternalMethod();
  error InvalidPhase();
  error NonExistentEntry();
  error Overfunded(uint256 amount);
  error InvalidCrowdfundBasisPointsFee(uint32 fee);
  error ReentrancyError();
  error RequiresAutomatonsManager(address who);
  error RequiresContinuousSupply();
  error RequiresDiamondOwnership(address who);
  error RequiresDifferentSenderAndRecipient(address a);
  error RequiresFastCaller();
  error RequiresFastContractCaller();
  error RequiresFastGovernorship(address who);
  error RequiresFastMemberCaller();
  error RequiresFastMembership(address who);
  error RequiresGovernorsManager(address who);
  error RequiresIssuerMemberCaller();
  error RequiresIssuerMembership(address who);
  error RequiresIssuerMemberOrIssuerCaller();
  error RequiresManagerCaller();
  error RequiresMarketplaceActiveMembership(address who);
  error RequiresMarketplaceDeactivatedMember(address who);
  error RequiresMarketplaceMembership(address who);
  error RequiresMembersManager(address who);
  error RequiresNoFastMemberships(address who);
  error RequiresOwner(address who);
  error RequiresPositiveBalance(address holder);
  error RequiresTransfersEnabled();
  error RequiresValidGovernor(address who);
  error RequiresValidMember(address who);
  error RequiresValidTokenHolder(address who);
  error TokenContractError();
  error UnknownBeneficiary(address who);
  error UnknownPledger(address who);
  error UnsupportedOperation();
}
