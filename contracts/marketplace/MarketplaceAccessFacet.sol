// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../issuer/IssuerTopFacet.sol';
import '../interfaces/IHasMembers.sol';
import '../interfaces/IHasActiveMembers.sol';
import './lib/LibMarketplaceAccess.sol';
import './lib/AMarketplaceFacet.sol';


/** @title The Marketplace Smart Contract.
 *  @dev The Marketplace Access facet is in charge of keeping track of marketplace members.
 */
contract MarketplaceAccessFacet is AMarketplaceFacet, IHasMembers, IHasActiveMembers {
  using LibAddressSet for LibAddressSet.Data;

  // Membership management.

  /** @dev Queries whether a given address is a member of this Marketplace or not.
   *  @param candidate is the address to test.
   *  @return A `boolean` flag.
   */
  function isMember(address candidate)
      external override view returns(bool) {
    return LibMarketplaceAccess.data().memberSet.contains(candidate);
  }

  /** @dev Counts the numbers of members present in this Marketplace.
   *  @return The number of members in this marketplace.
   */
  function memberCount()
      external override view returns(uint256) {
    return LibMarketplaceAccess.data().memberSet.values.length;
  }

  /** @dev Paginates the members of this Marketplace based on a starting cursor and a number of records per page.
   *  @param cursor is the index at which to start.
   *  @param perPage is how many records should be returned at most.
   *  @return A `address[]` list of values at most `perPage` big.
   *  @return A `uint256` index to the next page.
   */
  function paginateMembers(uint256 cursor, uint256 perPage)
      external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibMarketplaceAccess.data().memberSet.values, cursor, perPage);
  }

  /** @dev Adds a member to this Marketplace member list.
   *  @param member is the address of the member to be added.
   *  @notice Requires that the caller is a member of the linked Issuer.
   *  @notice Emits a `IHasMembers.MemberAdded` event.
   */
  function addMember(address payable member)
      external override
      onlyIssuerMember {
    // Add the member to our list.
    LibMarketplaceAccess.data().memberSet.add(member, false);
    // Emit!
    emit MemberAdded(member);
  }

  /** @dev Removes a member from this Marketplace.
   *  @param member is the address of the member to be removed.
   *  @notice Requires that the caller is a member of the linked Issuer.
   *  @notice Emits a `IHasMembers.MemberRemoved` event.
   */
  function removeMember(address member)
      external override
      onlyIssuerMember {
    LibMarketplaceAccess.Data storage s = LibMarketplaceAccess.data();
    // Ensure that member doesn't have any FAST membership.
    require(s.fastMemberships[member].values.length == 0, LibConstants.REQUIRES_NO_FAST_MEMBERSHIPS);
    // Remove member.
    s.memberSet.remove(member, false);
    // Emit!
    emit MemberRemoved(member);
  }

  /** @dev Allows to query FAST memberships for a given member address.
   *  @param member Is the address to check.
   *  @param cursor The index at which to start.
   *  @param perPage How many records should be returned at most.
   */
  function fastMemberships(address member, uint256 cursor, uint256 perPage)
      external view returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibMarketplaceAccess.data().fastMemberships[member].values, cursor, perPage);
  }

  /** @dev Callback from FAST contracts allowing the Marketplace contract to keep track of FAST memberships.
   *  @param member The member for which a new FAST membership has been added.
   */
  function memberAddedToFast(address member) 
      external {
    // Verify that the given address is in fact a registered FAST contract.
    require(
      IssuerTopFacet(LibMarketplace.data().issuer).isFastRegistered(msg.sender),
      LibConstants.REQUIRES_FAST_CONTRACT_CALLER
    );
    // Keep track of the member's FAST membership.
    LibAddressSet.Data storage memberFasts = LibMarketplaceAccess.data().fastMemberships[member];
    memberFasts.add(msg.sender, false);
  }

  /** @dev Callback from FAST contracts allowing the Marketplace contract to keep track of FAST memberships.
   *  @param member The member for which a FAST membership has been removed.
   */
  function memberRemovedFromFast(address member)
      external {
    require(
      IssuerTopFacet(LibMarketplace.data().issuer).isFastRegistered(msg.sender),
      LibConstants.REQUIRES_FAST_CONTRACT_CALLER
    );
    // Remove the tracked membership.
    LibAddressSet.Data storage memberFasts = LibMarketplaceAccess.data().fastMemberships[member];
    memberFasts.remove(msg.sender, false);
  }

  /** @dev Given a member returns it's activation status.
   *  @param member The member to check activation status on.
   */
  function isMemberActive(address member) external override view returns(bool) {
    return !LibMarketplaceAccess.data().deactivatedMemberSet.contains(member);
  }

  /** @dev Activates a member at the Marketplace level.
   *  @param member The member to remove from the deactivation member set.
   */
  function activateMember(address member)
    external
    override
    onlyIssuerMember
    onlyMember(member) {
    // Guard against attempting to activate an already active member.
    require(
      !this.isMemberActive(member),
      LibConstants.REQUIRES_MARKETPLACE_DEACTIVATED_MEMBER
    );

    // Remove the member from the deactivated members list.
    LibMarketplaceAccess.data().deactivatedMemberSet.remove(member, false);

    // Emit!
    emit MemberActivated(member);
  }

  /** @dev Deactivates a member at the Marketplace level.
   *  @param member The member to add to the deactivation member set.
   */
  function deactivateMember(address payable member)
    external
    override
    onlyIssuerMember
    onlyMember(member) {
    // Guard against attempting to deactivate an already deactivated member.
    require(
      this.isMemberActive(member),
      LibConstants.REQUIRES_MARKETPLACE_ACTIVE_MEMBER
    );

    // Add the member to the deactivated members list.
    LibMarketplaceAccess.data().deactivatedMemberSet.add(member, false);

    // Emit!
    emit MemberDeactivated(member);
  }
}
