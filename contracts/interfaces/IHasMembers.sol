// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


/// @title An interface signifying that the inheriting contract implements the concept of membership ACLs.
interface IHasMembers {
  /**
   * @notice Queries whether a given address is a member or not.
   * @param candidate is the address to test.
   * @return A `bool` equal to `true` when `candidate` is a member.
   */
  function isMember(address candidate) external view returns(bool);

  /**
   * @notice Queries the number of members.
   * @return An `uint256`.
   */
  function memberCount() external view returns(uint256);

  /**
   * @notice Queries pages of members based on a start index and a page size.
   * @param index is the offset at which the pagination operation should start.
   * @param perPage is how many items should be returned.
   * @return A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page.
   */
  function paginateMembers(uint256 index, uint256 perPage) external view returns(address[] memory, uint256);

  /**
   * @notice Adds a member to the list of known members.
   * @param candidate is the address to be added.
   */
  function addMember(address payable candidate) external;

  /**
   * @notice Removes a member from the list of known members.
   * @param member is the address to be removed.
   */
  function removeMember(address member) external;
}
