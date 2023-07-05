// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../lib/LibHelpers.sol";
import "../../lib/LibAddressSet.sol";
import "../../common/AHasGovernors.sol";
import "../../common/AHasMembers.sol";
import "../../common/AHasAutomatons.sol";
import "../../interfaces/IHasActiveMembers.sol";
import "../lib/LibFast.sol";
import "./IFastEvents.sol";

/**
 * @title Abstract FAST helper contract.
 * @notice This abstract contract encapsulates modifiers allowing inheriting facets to guard against
 * certain permissions.
 */
abstract contract AFastFacet is IFastEvents {
  using LibAddressSet for LibAddressSet.Data;

  /// Internal ACL functions.

  function _isMarketplaceMember(address who) internal view returns (bool) {
    return AHasMembers(LibFast.data().marketplace).isMember(who);
  }

  function _isMarketplaceActiveMember(address who) internal view returns (bool) {
    return IHasActiveMembers(LibFast.data().marketplace).isActiveMember(who);
  }

  function _isIssuerMember(address who) internal view returns (bool) {
    return AHasMembers(LibFast.data().issuer).isMember(who);
  }

  /// Modifiers.

  /// @notice Ensures that a method can only be called by another facet of the same diamond.
  modifier onlyDiamondFacet() {
    if (!LibHelpers._isDiamondFacet(msg.sender)) revert ICustomErrors.InternalMethod();
    _;
  }

  /// @notice Ensures that a method can only be called by the owner of this diamond.
  modifier onlyDiamondOwner() {
    if (!LibHelpers._isDiamondOwner(msg.sender)) revert ICustomErrors.RequiresDiamondOwnership(msg.sender);
    _;
  }

  /// @notice Ensures that a method can only be called by the singleton deployer contract factory.
  modifier onlyDeployer() {
    if (!LibHelpers._isDeployer(msg.sender)) revert ICustomErrors.InternalMethod();
    _;
  }

  /// @notice Ensures that a method can only be called by the issuer contract.
  modifier onlyIssuerContract() {
    if (msg.sender != LibFast.data().issuer) revert ICustomErrors.InternalMethod();
    _;
  }

  /**
   * @notice Ensures that the given address is a member of the Marketplace.
   * @param who The address to check.
   */
  modifier onlyMarketplaceMember(address who) {
    if (!_isMarketplaceMember(who)) revert ICustomErrors.RequiresMarketplaceMembership(who);
    _;
  }

  /**
   * @notice Ensures a who is an active member of the Marketplace.
   * @param who The address to check.
   */
  modifier onlyMarketplaceActiveMember(address who) {
    if (!_isMarketplaceActiveMember(who)) revert ICustomErrors.RequiresMarketplaceActiveMembership(who);
    _;
  }

  /**
   * @notice Ensures that the message sender is a member of the Issuer.
   */
  modifier onlyIssuerMember() {
    if (!_isIssuerMember(msg.sender)) revert ICustomErrors.RequiresIssuerMembership(msg.sender);
    _;
  }

  modifier onlyIssuerMemberOrIssuerContract() {
    if (!_isIssuerMember(msg.sender) && msg.sender != LibFast.data().issuer)
      revert ICustomErrors.RequiresIssuerMemberOrIssuerCaller();
    _;
  }

  /**
   * @notice Ensures that the given address is a governor of the FAST.
   * @param who The address to check.
   */
  modifier onlyGovernor(address who) {
    if (!AHasGovernors(address(this)).isGovernor(who)) revert ICustomErrors.RequiresFastGovernorship(who);
    _;
  }

  /**
   * @notice Ensures that the given address is a member of the FAST.
   * @param who The address to check.
   */
  modifier onlyMember(address who) {
    if (!AHasMembers(address(this)).isMember(who)) revert ICustomErrors.RequiresFastMembership(who);
    _;
  }

  /**
   * @notice Ensures address `a` and `b` are different.
   * @param a Address a
   * @param b Address b
   */
  modifier differentAddresses(address a, address b) {
    if (a == b) revert ICustomErrors.RequiresDifferentSenderAndRecipient(a);
    _;
  }
}
