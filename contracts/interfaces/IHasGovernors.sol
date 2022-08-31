// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


/// @title An interface signifying that the inheriting contract implements the concept of governorship ACLs.
interface IHasGovernors {
  /**
   * @notice Queries whether a given address is a governor or not.
   * @param candidate is the address to test.
   * @return A `bool` equal to `true` when `candidate` is a governor.
   */
  function isGovernor(address candidate) external view returns(bool);

  /**
   * @notice Queries the number of governors.
   * @return An `uint256`.
   */
  function governorCount() external view returns(uint256);

  /**
   * @notice Queries pages of governors based on a start index and a page size.
   * @param index is the offset at which the pagination operation should start.
   * @param perPage is how many items should be returned.
   * @return A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page.
   */
  function paginateGovernors(uint256 index, uint256 perPage) external view returns(address[] memory, uint256);

  /**
   * @notice Adds a governor to the list of known governors.
   * @param governor is the address to be added.
   */
  function addGovernor(address payable governor) external;

  /**
   * @notice Removes a governor from the list of known governors.
   * @param governor is the address to be removed.
   */
  function removeGovernor(address governor) external;
}
