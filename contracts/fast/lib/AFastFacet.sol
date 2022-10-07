// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../lib/LibConstants.sol';
import '../../lib/LibHelpers.sol';
import '../../lib/LibAddressSet.sol';
import '../../interfaces/ICustomErrors.sol';
import '../../interfaces/IHasMembers.sol';
import '../../interfaces/IHasGovernors.sol';
import '../../interfaces/IHasActiveMembers.sol';
import '../../interfaces/IERC173.sol';
import '../lib/LibFast.sol';
import './IFastEvents.sol';


/**
 * @title Abstract FAST helper contract.
 * @notice This abstract contract encapsulates modifiers allowing inheriting facets to guard against
 * certain permissions.
 */
abstract contract AFastFacet is IFastEvents {
  using LibAddressSet for LibAddressSet.Data;

  /// Modifiers.

  /// @notice Ensures that a method can only be called by another facet of the same diamond.
  modifier onlyDiamondFacet() {
    if (msg.sender != address(this)) {
      revert ICustomErrors.InternalMethod();
    }
    _;
  }

  /// @notice Ensures that a method can only be called by the owner of this diamond.
  modifier onlyDiamondOwner() {
    if (msg.sender != IERC173(address(this)).owner()) {
      revert ICustomErrors.RequiresDiamondOwnership(msg.sender);
    }
    _;
  }

  /// @notice Ensures that a method can only be called by the singleton deployer contract factory.
  modifier onlyDeployer() {
    if (msg.sender != LibConstants.DEPLOYER_CONTRACT) {
      revert ICustomErrors.InternalMethod();
    }
    _;
  }

  /**
   * @notice Ensures that the given address is a member of the Marketplace.
   * @param candidate The address to check.
   */
  modifier onlyMarketplaceMember(address candidate) {
    if (!IHasMembers(LibFast.data().marketplace).isMember(candidate)) {
      revert ICustomErrors.RequiresMarketplaceMembership(candidate);
    }
    _;
  }

  /**
   * @notice Ensures a candidate is an active member of the Marketplace.
   * @param candidate The address to check.
   */
  modifier onlyMarketplaceActiveMember(address candidate) {
    if (!IHasActiveMembers(LibFast.data().marketplace).isMemberActive(candidate)) {
      revert ICustomErrors.RequiresMarketplaceActiveMember(candidate);
    }
    _;
  }

  /**
   * @notice Ensures that the message sender is a member of the Issuer.
   */
  modifier onlyIssuerMember() {
    if (!IHasMembers(LibFast.data().issuer).isMember(msg.sender)) {
      revert ICustomErrors.RequiresIssuerMembership(msg.sender);
    }
    _;
  }

  /**
   * @notice Ensures that the given address is a governor of the FAST.
   * @param candidate The address to check.
   */
  modifier onlyGovernor(address candidate) {
    if (!IHasGovernors(address(this)).isGovernor(candidate)) {
      revert ICustomErrors.RequiresFastGovernorship(candidate);
    }
    _;
  }

  /**
   * @notice Ensures that the given address is a member of the FAST.
   * @param candidate The address to check.
   */
  modifier onlyMember(address candidate) {
    if (!IHasMembers(address(this)).isMember(candidate)) {
      revert ICustomErrors.RequiresFastMembership(candidate);
    }
    _;
  }

  /**
   * @notice Ensures address `a` and `b` are different.
   * @param a Address a
   * @param b Address b
   */
  modifier differentAddresses(address a, address b) {
    if (a == b) {
      revert ICustomErrors.RequiresDifferentSenderAndRecipient(a);
    }
    _;
  }
}
