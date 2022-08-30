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


/**
* @dev This contract is a group of modifiers that can be used by any facets to guard against
*       certain permissions.
*/
abstract contract AFastFacet is IFastEvents {
  using LibAddressSet for LibAddressSet.Data;

  /// Functions.

  /**
   * @notice Checks whether the caller is another facet of the same diamond.
   * @return bool set to `true` when the caller is the diamond, `false` otherwise.
   */
  function isDiamondFacet()
      internal view returns(bool) {
    return msg.sender == address(this);
  }

  /**
   * @notice Queries whether a given address is a member (maybe de-activated) of the Marketplace.
   * @param candidate is the address to check.
   * @return bool set to `true` if `candidate` is a member of the Marketplace, `false` otherwise.
   */
  function isMarketplaceMember(address candidate)
      internal view returns(bool) {
    return IHasMembers(LibFast.data().marketplace).isMember(candidate);
  }

  /**
   * @notice Queries whether a given address is an active member of the Marketplace.
   * @param candidate is the address to check.
   * @return bool set to `true` whether `candidate` is both a member of the Marketplace and flagged as active.
   */
  function isMarketplaceActiveMember(address candidate)
      internal view returns(bool) {
    IHasActiveMembers(LibFast.data().marketplace).isMemberActive(candidate);
  }

  /// Modifiers.

  /// @dev Ensures that a method can only be called by another facet of the same diamond.
  modifier onlyDiamondFacet() {
    require(isDiamondFacet(), LibConstants.INTERNAL_METHOD);
    _;
  }

  /// @dev Ensures that a method can only be called by the owner of this diamond.
  modifier onlyDiamondOwner() {
    require(
      msg.sender == IERC173(address(this)).owner(),
      LibConstants.REQUIRES_DIAMOND_OWNERSHIP
    );
    _;
  }

  /// @dev Ensures that a method can only be called by the singleton deployer contract factory.
  modifier onlyDeployer() {
    require(
      msg.sender == LibConstants.DEPLOYER_CONTRACT,
      LibConstants.INTERNAL_METHOD
    );
    _;
  }

  /** @dev Ensures that the given address is a member of the Marketplace.
   *  @param candidate The address to check.
   */
  modifier onlyMarketplaceMember(address candidate) {
    require(
      isMarketplaceMember(candidate),
      LibConstants.REQUIRES_MARKETPLACE_MEMBERSHIP
    );
    _;
  }

  /** @dev Ensures a candidate is active in the Marketplace.
   *  @param candidate The address to check activation status on.
   */
  modifier onlyMarketplaceActiveMember(address candidate) {
    require(
      isMarketplaceActiveMember(candidate),
      LibConstants.REQUIRES_MARKETPLACE_ACTIVE_MEMBER
    );
    _;
  }

  /** @dev Ensures that the message sender is a member of the ISSUER.
   */
  modifier onlyIssuerMember() {
    require(
      IHasMembers(LibFast.data().issuer).isMember(msg.sender),
      LibConstants.REQUIRES_ISSUER_MEMBERSHIP
    );
    _;
  }

  /** @dev Ensures that the given address is a governor of the FAST.
   *  @param candidate The address to check.
   */
  modifier onlyGovernor(address candidate) {
    require(
      IHasGovernors(address(this)).isGovernor(candidate),
      LibConstants.REQUIRES_FAST_GOVERNORSHIP
    );
    _;
  }

  /** @dev Ensures that the given address is a member of the FAST.
   *  @param candidate The address to check.
   */
  modifier onlyMember(address candidate) {
    require(
      IHasMembers(address(this)).isMember(candidate),
      LibConstants.REQUIRES_FAST_MEMBERSHIP
    );
    _;
  }

  /** @dev Ensures address a is different from address b.
   *  @param a Address a
   *  @param b Address b
   */
  modifier differentAddresses(address a, address b) {
    require(a == b, LibConstants.REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT);
    _;
  }
}
