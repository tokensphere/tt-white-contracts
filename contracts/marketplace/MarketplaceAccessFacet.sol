// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../lib/LibAddressSet.sol";
import "../lib/LibPaginate.sol";
import "../common/AHasMembers.sol";
import "../common/AHasForwarder.sol";
import "../common/AHasContext.sol";
import "../issuer/IssuerTopFacet.sol";
import "../interfaces/ICustomErrors.sol";
import "../interfaces/IHasActiveMembers.sol";
import "./lib/LibMarketplaceAccess.sol";
import "./lib/AMarketplaceFacet.sol";
import "./MarketplaceAutomatonsFacet.sol";

/**
 * @title The Marketplace Smart Contract.
 * @notice The Marketplace Access facet is in charge of keeping track of marketplace members.
 */
contract MarketplaceAccessFacet is AMarketplaceFacet, AHasMembers, AHasContext, IHasActiveMembers {
  using LibAddressSet for LibAddressSet.Data;

  /// AHasContext implementation.

  // TODO: Could _isTrustedForwarder actually have it's default implementation point to
  // IHasForwarder(address(this)).isTrustedForwarder(forwarder) or similar?
  function _isTrustedForwarder(address forwarder) internal view override(AHasContext) returns (bool) {
    return AHasForwarder(address(this)).isTrustedForwarder(forwarder);
  }

  // Override base classes to use the AHasContext implementation.
  function _msgSender() internal view override(AHasMembers, AHasContext) returns (address) {
    return AHasContext._msgSender();
  }

  /// AHasMembers implementation.

  function isMembersManager(address who) internal view override(AHasMembers) returns (bool) {
    return _isIssuerMember(who) || AHasAutomatons(address(this)).automatonCan(who, MARKETPLACE_PRIVILEGE_MANAGE_MEMBERS);
  }

  function isValidMember(address who) internal pure override(AHasMembers) returns (bool) {
    return who != LibHelpers.ZERO_ADDRESS;
  }

  function onMemberRemoved(address member) internal view override(AHasMembers) {
    LibMarketplaceAccess.Data storage s = LibMarketplaceAccess.data();
    // Ensure that member doesn't have any FAST membership.
    if (s.fastMemberships[member].values.length != 0) revert ICustomErrors.RequiresNoFastMemberships(member);
  }

  /// FAST memberships functions.

  /**
   * @notice Allows to query FAST memberships for a given member address.
   * @param member Is the address to check.
   * @param cursor The index at which to start.
   * @param perPage How many records should be returned at most.
   */
  function fastMemberships(
    address member,
    uint256 cursor,
    uint256 perPage
  ) external view returns (address[] memory, uint256) {
    return LibPaginate.addresses(LibMarketplaceAccess.data().fastMemberships[member].values, cursor, perPage);
  }

  /**
   * @notice Callback from FAST contracts allowing the Marketplace contract to keep track of FAST memberships.
   * @param member The member for which a new FAST membership has been added.
   */
  function memberAddedToFast(address member) external {
    // Verify that the given address is in fact a registered FAST contract.
    if (!IssuerTopFacet(LibMarketplace.data().issuer).isFastRegistered(_msgSender())) {
      revert ICustomErrors.RequiresFastContractCaller();
    }
    // Keep track of the member's FAST membership.
    // TODO: We don't throw until we've fixed the `marketplace.fastMemberships`.
    LibMarketplaceAccess.data().fastMemberships[member].add(_msgSender(), true);
  }

  /**
   * @notice Callback from FAST contracts allowing the Marketplace contract to keep track of FAST memberships.
   * @param member The member for which a FAST membership has been removed.
   */
  function memberRemovedFromFast(address member) external {
    if (!IssuerTopFacet(LibMarketplace.data().issuer).isFastRegistered(_msgSender())) {
      revert ICustomErrors.RequiresFastContractCaller();
    }
    // Remove the tracked membership.
    // TODO: We don't throw until we've fixed the `marketplace.fastMemberships`.
    LibMarketplaceAccess.data().fastMemberships[member].remove(_msgSender(), true);
  }

  /// IHasActiveMembers implementation.

  /**
   * @notice Given a member returns it's activation status.
   * @param candidate The address to check activation status on.
   */
  function isActiveMember(address candidate) external view override(IHasActiveMembers) returns (bool) {
    return AHasMembers(this).isMember(candidate) && !LibMarketplaceAccess.data().deactivatedMemberSet.contains(candidate);
  }

  /**
   * @notice Activates a member at the Marketplace level.
   * @param member The member to remove from the deactivation member set.
   */
  function activateMember(address member) external override(IHasActiveMembers) onlyIssuerMember onlyMember(member) {
    // Guard against attempting to activate an already active member.
    if (this.isActiveMember(member)) revert ICustomErrors.RequiresMarketplaceDeactivatedMember(member);
    // Remove the member from the deactivated members list.
    LibMarketplaceAccess.data().deactivatedMemberSet.remove(member, false);
    // Emit!
    emit MemberActivated(member);
  }

  /**
   * @notice Deactivates a member at the Marketplace level.
   * @param member The member to add to the deactivation member set.
   */
  function deactivateMember(address member) external override(IHasActiveMembers) onlyIssuerMember onlyMember(member) {
    // Guard against attempting to deactivate an already deactivated member.
    if (!this.isActiveMember(member)) revert ICustomErrors.RequiresMarketplaceActiveMembership(member);
    // Add the member to the deactivated members list.
    LibMarketplaceAccess.data().deactivatedMemberSet.add(member, false);
    // Emit!
    emit MemberDeactivated(member);
  }
}
