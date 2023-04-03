// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../common/lib/LibHasMembers.sol';
import '../interfaces/ICustomErrors.sol';


/**
 * @title The Fast Smart Contract.
 * @notice The Fast Members facet is in charge of keeping track of automaton accounts.
 */
abstract contract AHasMembers {
  using LibAddressSet for LibAddressSet.Data;

  /// Errors.

  error RequiresMembersManager(address who);
  error RequiresValidMember(address who);

  /// Events.

  /**
   * @notice Emited when a member is added to the implementing contract.
   * @param member is the address of the added member.
   */
  event MemberAdded(address indexed member);
  /**
   * @notice Emited when a member is removed to the implementing contract.
   * @param member is the address of the removed member.
   */
  event MemberRemoved(address indexed member);

  // Must be overriden.
  function isMembersManager(address who)
      virtual internal view
      returns(bool);

  // Must be overriden.
  function isValidMember(address who)
      virtual internal view
      returns(bool);

  // May be overriden.
  function onMemberAdded(address member)
      virtual internal {}
  
  // May be overriden.
  function onMemberRemoved(address member)
      virtual internal {}
  
  // Members management.

  /**
   * @notice Queries whether a given address is a member or not.
   * @param who is the address to test.
   * @return A `bool` equal to `true` when `candidate` is a member.
   */
  function isMember(address who)
      external view returns(bool) {
    return LibHasMembers.data().memberSet.contains(who);
  }

  /**
   * @notice Queries the number of members.
   * @return An `uint256`.
   */
  function memberCount()
      external view returns(uint256) {
    return LibHasMembers.data().memberSet.values.length;
  }

  /**
   * @notice Queries pages of members based on a start index and a page size.
   * @param index is the offset at which the pagination operation should start.
   * @param perPage is how many items should be returned.
   * @return A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page.
   */
  function paginateMembers(uint256 index, uint256 perPage)
      external view returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibHasMembers.data().memberSet.values, index, perPage);
  }

  /**
   * @notice Adds a member to the list of known members.
   * @param who is the address to be added.
   */
  function addMember(address payable who)
      external 
      onlyMemberManager(msg.sender) onlyValidMember(who) {
    // Add the member.
    LibHasMembers.data().memberSet.add(who, false);
    // Notify via callback.
    onMemberAdded(who);
    // Emit!
    emit MemberAdded(who);
  }

  /**
   * @notice Removes a member from this contract.
   * @param member The address of the member to be removed.
   * @notice Requires that the caller is a member of this Issuer.
   * @notice Emits a `AHasMembers.MemberRemoved` event.
   */
  function removeMember(address member)
      external 
      onlyMemberManager(msg.sender) {
    // Notify via callback.
    onMemberRemoved(member);
    // Remove member.
    LibHasMembers.data().memberSet.remove(member, false);
    // Emit!
    emit MemberRemoved(member);
  }

  /// Modifiers.

  modifier onlyMemberManager(address who) {
    if (!isMembersManager(who))
      revert RequiresMembersManager(who);
    _;
  }

  modifier onlyValidMember(address who) {
    if (!isValidMember(who))
      revert RequiresValidMember(who);
    _;
  }
}
