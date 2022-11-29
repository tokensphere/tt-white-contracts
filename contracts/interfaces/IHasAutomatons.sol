// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


/// @title An interface signifying that the inheriting contract implements the concept of automatonship ACLs.
interface IHasAutomatons {
  /**
   * @notice Queries whether a given address is a automaton or not.
   * @param candidate is the address to test.
   * @return A `bool` equal to `true` when `candidate` is a automaton.
   */
  function isAutomaton(address candidate) external view returns(bool);

  /**
   * @notice Queries flags assigned to a given automaton account.
   * @param automaton is the address to test.
   * @return A `uint256` representing a binary combination of possible flags.
   */
  function automatonPrivileges(address automaton) external view returns(uint256);

  /**
   * @notice Queries the number of automatons.
   * @return An `uint256`.
   */
  function automatonCount() external view returns(uint256);

  /**
   * @notice Queries pages of automatons based on a start index and a page size.
   * @param index is the offset at which the pagination operation should start.
   * @param perPage is how many items should be returned.
   * @return A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page.
   */
  function paginateAutomatons(uint256 index, uint256 perPage) external view returns(address[] memory, uint256);

  /**
   * @notice Adds a automaton to the list of known automatons.
   * @param candidate is the address to be added.
   */
  function setAutomatonPrivileges(address candidate, uint256 privileges) external;

  /**
   * @notice Removes a automaton from the list of known automatons.
   * @param automaton is the address to be removed.
   */
  function removeAutomaton(address automaton) external;
}
