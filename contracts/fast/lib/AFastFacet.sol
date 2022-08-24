// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../lib/LibConstants.sol';
import '../../lib/LibHelpers.sol';
import '../../lib/LibAddressSet.sol';
import '../../interfaces/IHasMembers.sol';
import '../../interfaces/IHasGovernors.sol';
import '../../interfaces/IHasActiveMembers.sol';
import '../../interfaces/IERC173.sol';
import '../lib/LibFast.sol';
import './IFastEvents.sol';


/** @title Abstract FAST helper contract.
* @notice This abstract contract encapsulates modifiers allowing inheriting facets to guard against
* certain permissions.
*/
abstract contract AFastFacet is IFastEvents {
  using LibAddressSet for LibAddressSet.Data;

  /// Modifiers.

  /// @notice Ensures that a method can only be called by another facet of the same diamond.
  modifier onlyDiamondFacet() {
    require(
      msg.sender == address(this),
      LibConstants.INTERNAL_METHOD
    );
    _;
  }

  /// @notice Ensures that a method can only be called by the owner of this diamond.
  modifier onlyDiamondOwner() {
    require(
      msg.sender == IERC173(address(this)).owner(),
      LibConstants.REQUIRES_DIAMOND_OWNERSHIP
    );
    _;
  }

  /// @notice Ensures that a method can only be called by the singleton deployer contract factory.
  modifier onlyDeployer() {
    require(
      msg.sender == LibConstants.DEPLOYER_CONTRACT,
      LibConstants.INTERNAL_METHOD
    );
    _;
  }

  /** @notice Ensures that the given address is a member of the Marketplace.
   * @param candidate The address to check.
   */
  modifier onlyMarketplaceMember(address candidate) {
    require(
      IHasMembers(LibFast.data().marketplace).isMember(candidate),
      LibConstants.REQUIRES_MARKETPLACE_MEMBERSHIP
    );
    _;
  }

  /** @notice Ensures a candidate is an active member of the Marketplace.
   * @param candidate The address to check.
   */
  modifier onlyMarketplaceActiveMember(address candidate) {
    require(
      IHasActiveMembers(LibFast.data().marketplace).isMemberActive(candidate),
      LibConstants.REQUIRES_MARKETPLACE_ACTIVE_MEMBER
    );
    _;
  }

  /** @notice Ensures that the message sender is a member of the Issuer.
   */
  modifier onlyIssuerMember() {
    require(
      IHasMembers(LibFast.data().issuer).isMember(msg.sender),
      LibConstants.REQUIRES_ISSUER_MEMBERSHIP
    );
    _;
  }

  /** @notice Ensures that the given address is a governor of the FAST.
   * @param candidate The address to check.
   */
  modifier onlyGovernor(address candidate) {
    require(
      IHasGovernors(address(this)).isGovernor(candidate),
      LibConstants.REQUIRES_FAST_GOVERNORSHIP
    );
    _;
  }

  /** @notice Ensures that the given address is a member of the FAST.
   * @param candidate The address to check.
   */
  modifier onlyMember(address candidate) {
    require(
      IHasMembers(address(this)).isMember(candidate),
      LibConstants.REQUIRES_FAST_MEMBERSHIP
    );
    _;
  }

  /** @notice Ensures address `a` and `b` are different.
   * @param a Address a
   * @param b Address b
   */
  modifier differentAddresses(address a, address b) {
    require(a != b, LibConstants.REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT);
    _;
  }
}
