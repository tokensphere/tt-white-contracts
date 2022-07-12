// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../lib/LibHelpers.sol';
import '../interfaces/IHasMembers.sol';
import '../fast/FastTopFacet.sol';
import '../fast/FastTokenFacet.sol';
import './lib/ASpcFacet.sol';
import './lib/LibSpcAccess.sol';


contract SpcAccessFacet is ASpcFacet, IHasMembers {
  using LibAddressSet for LibAddressSet.Data;

  // Constants.

  // This represents how much Eth we provision new SPC members with.
  uint256 constant private MEMBER_ETH_PROVISION = 10 ether;
  // This represents how much Eth new FASTs are provisioned with.
  uint256 constant private FAST_ETH_PROVISION = 250 ether;

  // Initializers.

  function initializeAccessFacet(address payable member)
      external
      onlyDiamondFacet {
    // Grab our storage.
    LibSpcAccess.Data storage s = LibSpcAccess.data();
    // Make sure we haven't initialized yet.
    require(s.version < LibSpcAccess.STORAGE_VERSION, LibConstants.ALREADY_INITIALIZED);
    // Initialize access storage.
    s.version = LibSpcAccess.STORAGE_VERSION;

    // Add the member.
    s.memberSet.add(member, false);
    // Emit!
    emit IHasMembers.MemberAdded(member);
  }

  // Membership management.

  /** @dev Queries whether a given address is a member of this SPC or not.
   *  @param candidate The address to test.
   *  @return A `boolean` flag.
   */
  function isMember(address candidate)
      external override view returns(bool) {
    return LibSpcAccess.data().memberSet.contains(candidate);
  }

  /** @dev Counts the numbers of members present in this SPC.
   *  @return The number of members in this SPC.
   */
  function memberCount()
      external override view returns(uint256) {
    return LibSpcAccess.data().memberSet.values.length;
  }

  /** @dev Paginates the members of this SPC based on a starting cursor and a number of records per page.
   *  @param cursor The index at which to start.
   *  @param perPage How many records should be returned at most.
   *  @return A `address[]` list of values at most `perPage` big.
   *  @return A `uint256` index to the next page.
   */
  function paginateMembers(uint256 cursor, uint256 perPage)
      external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibSpcAccess.data().memberSet.values, cursor, perPage);
  }

  /** @dev Adds a member to this SPC member list.
   *  @param member The address of the member to be added.
   *  @notice Requires that the caller is a member of this SPC.
   *  @notice Emits a `IHasMembers.MemberAdded` event.
   */
  function addMember(address payable member)
      external override
      onlyMember(msg.sender) {
    // Add the member to our list.
    LibSpcAccess.data().memberSet.add(member, false);

    // Provision the member with some Eth.
    uint256 amount = LibHelpers.upTo(member, MEMBER_ETH_PROVISION);
    if (amount != 0) { member.transfer(amount); }

    // Emit!
    emit IHasMembers.MemberAdded(member);
  }

  /** @dev Removes a member from this SPC.
   *  @param member The address of the member to be removed.
   *  @notice Requires that the caller is a member of this SPC.
   *  @notice Emits a `IHasMembers.MemberRemoved` event.
   */
  function removeMember(address member)
      external override
      onlyMember(msg.sender) {
    // No suicide allowed.
    require(msg.sender != member, 'Cannot remove self');
    // Remove the member from the set.
    LibSpcAccess.data().memberSet.remove(member, false);
    // Emit!
    emit IHasMembers.MemberRemoved(member);
  }
}
