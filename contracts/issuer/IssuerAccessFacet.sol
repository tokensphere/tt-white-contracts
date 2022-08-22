// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../lib/LibHelpers.sol';
import '../interfaces/IHasMembers.sol';
import '../fast/FastTopFacet.sol';
import '../fast/FastTokenFacet.sol';
import './lib/AIssuerFacet.sol';
import './lib/LibIssuerAccess.sol';
import '../issuer/IssuerTopFacet.sol';


contract IssuerAccessFacet is AIssuerFacet, IHasMembers {
  using LibAddressSet for LibAddressSet.Data;
  // Membership management.

  /** @dev Queries whether a given address is a member of this Issuer or not.
   *  @param candidate The address to test.
   *  @return A `boolean` flag.
   */
  function isMember(address candidate)
      external override view returns(bool) {
    return LibIssuerAccess.data().memberSet.contains(candidate);
  }

  /** @dev Counts the numbers of members present in this Issuer.
   *  @return The number of members in this Issuer.
   */
  function memberCount()
      external override view returns(uint256) {
    return LibIssuerAccess.data().memberSet.values.length;
  }

  /** @dev Paginates the members of this Issuer based on a starting cursor and a number of records per page.
   *  @param cursor The index at which to start.
   *  @param perPage How many records should be returned at most.
   *  @return A `address[]` list of values at most `perPage` big.
   *  @return A `uint256` index to the next page.
   */
  function paginateMembers(uint256 cursor, uint256 perPage)
      external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibIssuerAccess.data().memberSet.values, cursor, perPage);
  }

  /** @dev Adds a member to this Issuer member list.
   *  @param member The address of the member to be added.
   *  @notice Requires that the caller is a member of this Issuer.
   *  @notice Emits a `IHasMembers.MemberAdded` event.
   */
  function addMember(address payable member)
      external override
      onlyMember(msg.sender) {
    // Add the member to our list.
    LibIssuerAccess.data().memberSet.add(member, false);
    // Emit!
    emit MemberAdded(member);
  }

  /** @dev Removes a member from this Issuer.
   *  @param member The address of the member to be removed.
   *  @notice Requires that the caller is a member of this Issuer.
   *  @notice Emits a `IHasMembers.MemberRemoved` event.
   */
  function removeMember(address member)
      external override
      onlyMember(msg.sender) {
    // No suicide allowed.
    require(msg.sender != member, 'Cannot remove self');
    // Remove the member from the set.
    LibIssuerAccess.data().memberSet.remove(member, false);
    // Emit!
    emit MemberRemoved(member);
  }

  /** @notice Callback from FAST contracts allowing the Issuer contract to keep track of governorships.
   * @param governor The governor added to a FAST.
   */
  function governorAddedToFast(address governor)
      external {
    // Verify that the given address is in fact a registered FAST contract.
    require(
      IssuerTopFacet(address(this)).isFastRegistered(msg.sender),
      LibConstants.REQUIRES_FAST_CONTRACT_CALLER
    );
    // Keep track of the governorship.
    LibAddressSet.Data storage governorships = LibIssuerAccess.data().fastGovernorships[governor];
    governorships.add(msg.sender, false);
  }

  /** @notice Callback from FAST contracts allowing the Issuer contract to keep track of governorships.
   * @param governor The governor removed from a FAST.
   */
  function governorRemovedFromFast(address governor)
      external {
    // Verify that the given address is in fact a registered FAST contract.
    require(
      IssuerTopFacet(address(this)).isFastRegistered(msg.sender),
      LibConstants.REQUIRES_FAST_CONTRACT_CALLER
    );
    // Remove the tracked governorship.
    LibAddressSet.Data storage governorships = LibIssuerAccess.data().fastGovernorships[governor];
    governorships.remove(msg.sender, false);
  }

  /** @notice Returns a list of FASTs that the passed address is a governor of.
   * @param governor The governor to return a list of FASTs for.
   * @return address[] A list of FAST addresses.
   */
  function governorshipsFor(address governor)
      external view
      returns (address[] memory) {
    LibAddressSet.Data storage governorships = LibIssuerAccess.data().fastGovernorships[governor];
    return governorships.values;
  }
}
