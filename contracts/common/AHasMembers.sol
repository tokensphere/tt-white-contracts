// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../lib/LibAddressSet.sol";
import "../lib/LibPaginate.sol";
import "../interfaces/ICustomErrors.sol";
import "./lib/LibHasMembers.sol";

/**
 * @title The Fast Smart Contract.
 * @notice The Fast Members abstract contract is in charge of keeping track of automaton accounts.
 */
abstract contract AHasMembers {
  using LibAddressSet for LibAddressSet.Data;

  /// Errors.

  /// @notice Happens when a function is called by an address that is not a members manager.
  error RequiresMembersManager(address who);
  /// @notice Happens when an address is used as a member but is not valid.
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

  /**
   * @notice Checks whether the given address is a members manager or not.
   * @dev Must be implemented by the inheriting contract.
   * @param who is the address to test.
   */
  function isMembersManager(address who) internal view virtual returns (bool);

  /**
   * @notice Checks whether the given address can be added as a member or not.
   * @dev Must be implemented by the inheriting contract.
   * @param who is the address to test.
   */
  function isValidMember(address who) internal view virtual returns (bool);

  /**
   * @notice This callback is called when a member is added to the contract.
   * @dev May be overriden by the inheriting contract.
   * @param member is the address which was added.
   */
  function onMemberAdded(address member) internal virtual {}

  /**
   * @notice This callback is called when a member is removed to the contract.
   * @dev May be overriden by the inheriting contract.
   * @param member is the address which was removed.
   */
  function onMemberRemoved(address member) internal virtual {}

  // Members management.

  /**
   * @notice Queries whether a given address is a member or not.
   * @param who is the address to test.
   * @return A `bool` equal to `true` when `candidate` is a member.
   */
  function isMember(address who) external view returns (bool) {
    return LibHasMembers.data().memberSet.contains(who);
  }

  /**
   * @notice Queries the number of members.
   * @return An `uint256`.
   */
  function memberCount() external view returns (uint256) {
    return LibHasMembers.data().memberSet.values.length;
  }

  /**
   * @notice Queries pages of members based on a start index and a page size.
   * @param index is the offset at which the pagination operation should start.
   * @param perPage is how many items should be returned.
   * @return A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page.
   */
  function paginateMembers(uint256 index, uint256 perPage) external view returns (address[] memory, uint256) {
    return LibPaginate.addresses(LibHasMembers.data().memberSet.values, index, perPage);
  }

  /**
   * @notice Adds a member to the list of known members.
   * @param who is the address to be added.
   */
  function addMember(address who) external onlyMemberManager(msg.sender) onlyValidMember(who) {
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
  function removeMember(address member) external onlyMemberManager(msg.sender) {
    // Notify via callback.
    onMemberRemoved(member);
    // Remove member.
    LibHasMembers.data().memberSet.remove(member, false);
    // Emit!
    emit MemberRemoved(member);
  }

  /// Modifiers.

  modifier onlyMemberManager(address who) {
    if (!isMembersManager(who)) revert RequiresMembersManager(who);
    _;
  }

  modifier onlyValidMember(address who) {
    if (!isValidMember(who)) revert RequiresValidMember(who);
    _;
  }
}
