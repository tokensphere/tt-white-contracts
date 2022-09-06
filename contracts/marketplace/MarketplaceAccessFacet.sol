// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../issuer/IssuerTopFacet.sol';
import '../interfaces/ICustomErrors.sol';
import '../interfaces/IHasMembers.sol';
import '../interfaces/IHasActiveMembers.sol';
import './lib/LibMarketplaceAccess.sol';
import './lib/AMarketplaceFacet.sol';


/**
 * @title The Marketplace Smart Contract.
 * @notice The Marketplace Access facet is in charge of keeping track of marketplace members.
 */
contract MarketplaceAccessFacet is AMarketplaceFacet, IHasMembers, IHasActiveMembers {
  using LibAddressSet for LibAddressSet.Data;

  // Membership management.

  /**
   * @notice Queries whether a given address is a member of this Marketplace or not.
   * @param candidate is the address to test.
   * @return A `boolean` flag.
   */
  function isMember(address candidate)
      external override view returns(bool) {
    return LibMarketplaceAccess.data().memberSet.contains(candidate);
  }

  /**
   * @notice Counts the numbers of members present in this Marketplace.
   * @return The number of members in this marketplace.
   */
  function memberCount()
      external override view returns(uint256) {
    return LibMarketplaceAccess.data().memberSet.values.length;
  }

  /**
   * @notice Paginates the members of this Marketplace based on a starting cursor and a number of records per page.
   * @param cursor is the index at which to start.
   * @param perPage is how many records should be returned at most.
   * @return A `address[]` list of values at most `perPage` big.
   * @return A `uint256` index to the next page.
   */
  function paginateMembers(uint256 cursor, uint256 perPage)
      external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibMarketplaceAccess.data().memberSet.values, cursor, perPage);
  }

  /**
   * @notice Adds a member to this Marketplace member list.
   * @param member is the address of the member to be added.
   * @notice Requires that the caller is a member of the linked Issuer.
   * @notice Emits a `IHasMembers.MemberAdded` event.
   */
  function addMember(address payable member)
      external override
      onlyIssuerMember {
    // Add the member to our list.
    LibMarketplaceAccess.data().memberSet.add(member, false);
    // Emit!
    emit MemberAdded(member);
  }

  /**
   * @notice Removes a member from this Marketplace.
   * @param member is the address of the member to be removed.
   * @notice Requires that the caller is a member of the linked Issuer.
   * @notice Emits a `IHasMembers.MemberRemoved` event.
   */
  function removeMember(address member)
      external override
      onlyIssuerMember {
    LibMarketplaceAccess.Data storage s = LibMarketplaceAccess.data();
    // Ensure that member doesn't have any FAST membership.
    if (s.fastMemberships[member].values.length != 0) {
      revert ICustomErrors.RequiresNoFastMemberships(member);
    }
    // Remove member.
    s.memberSet.remove(member, false);
    // Emit!
    emit MemberRemoved(member);
  }

  /**
   * @notice Allows to query FAST memberships for a given member address.
   * @param member Is the address to check.
   * @param cursor The index at which to start.
   * @param perPage How many records should be returned at most.
   */
  function fastMemberships(address member, uint256 cursor, uint256 perPage)
      external view returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibMarketplaceAccess.data().fastMemberships[member].values, cursor, perPage);
  }

  /**
   * @notice Callback from FAST contracts allowing the Marketplace contract to keep track of FAST memberships.
   * @param member The member for which a new FAST membership has been added.
   */
  function memberAddedToFast(address member) 
      external {
    // Verify that the given address is in fact a registered FAST contract.
    if (!IssuerTopFacet(LibMarketplace.data().issuer).isFastRegistered(msg.sender)) {
      revert ICustomErrors.RequiresFastContractCaller();
    }
    // Keep track of the member's FAST membership.
    LibMarketplaceAccess.data().fastMemberships[member].add(msg.sender, false);
  }

  /**
   * @notice Callback from FAST contracts allowing the Marketplace contract to keep track of FAST memberships.
   * @param member The member for which a FAST membership has been removed.
   */
  function memberRemovedFromFast(address member)
      external {
    if (!IssuerTopFacet(LibMarketplace.data().issuer).isFastRegistered(msg.sender)) {
      revert ICustomErrors.RequiresFastContractCaller();
    }
    // Remove the tracked membership.
    LibMarketplaceAccess.data().fastMemberships[member].remove(msg.sender, false);
  }

  /**
   * @notice Given a member returns it's activation status.
   * @param member The member to check activation status on.
   */
  function isMemberActive(address member) external override view returns(bool) {
    return !LibMarketplaceAccess.data().deactivatedMemberSet.contains(member);
  }

  /**
   * @notice Activates a member at the Marketplace level.
   * @param member The member to remove from the deactivation member set.
   */
  function activateMember(address member)
    external
    override
    onlyIssuerMember
    onlyMember(member) {
    // Guard against attempting to activate an already active member.
    if (this.isMemberActive(member)) {
      revert ICustomErrors.RequiresMarketplaceDeactivatedMember(member);
    }

    // Remove the member from the deactivated members list.
    LibMarketplaceAccess.data().deactivatedMemberSet.remove(member, false);

    // Emit!
    emit MemberActivated(member);
  }

  /**
   * @notice Deactivates a member at the Marketplace level.
   * @param member The member to add to the deactivation member set.
   */
  function deactivateMember(address payable member)
    external
    override
    onlyIssuerMember
    onlyMember(member) {
    // Guard against attempting to deactivate an already deactivated member.
    if (!this.isMemberActive(member)) {
      revert ICustomErrors.RequiresMarketplaceActiveMember(member);
    }

    // Add the member to the deactivated members list.
    LibMarketplaceAccess.data().deactivatedMemberSet.add(member, false);

    // Emit!
    emit MemberDeactivated(member);
  }
}
