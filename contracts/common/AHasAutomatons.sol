// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../lib/LibAddressSet.sol";
import "../lib/LibPaginate.sol";
import "./lib/LibHasAutomatons.sol";

/**
 * @title The Fast Smart Contract.
 * @notice The Fast Automatons abstract contract is in charge of keeping track of automaton accounts.
 */
abstract contract AHasAutomatons {
  using LibAddressSet for LibAddressSet.Data;

  /// Errors.

  error RequiresAutomatonsManager(address who);

  /// Events.

  /**
   * @notice Emited when an automaton is added or changed.
   * @param automaton is the address of the automaton.
   * @param privileges is the new bitfield assigned to this automaton.
   */
  event AutomatonPrivilegesSet(address indexed automaton, uint32 indexed privileges);

  /**
   * @notice Emited when an automaton is removed.
   * @param automaton is the address of the removed automaton.
   */
  event AutomatonRemoved(address indexed automaton);

  // Must be overriden.
  function isAutomatonsManager(address who) internal view virtual returns (bool);

  // May be overriden.
  function onAutomatonAdded(address member) internal virtual {}

  // May be overriden.
  function onAutomatonRemoved(address member) internal virtual {}

  /// Automatons management.

  /**
   * @notice Queries whether a given address is an automaton for this Fast or not.
   * @param candidate is the address to test.
   * @return A `boolean` flag.
   */
  function isAutomaton(address candidate) external view returns (bool) {
    return LibHasAutomatons.data().automatonSet.contains(candidate);
  }

  /**
   * @notice Returns the privileges for a given automaton address, or zero if no privileges exist.
   * @param automaton is the address to test.
   * @return An `uint256` bitfield.
   */
  function automatonPrivileges(address automaton) external view returns (uint32) {
    return LibHasAutomatons.data().automatonPrivileges[automaton];
  }

  function automatonCan(address automaton, uint32 privilege) external view returns (bool) {
    return (LibHasAutomatons.data().automatonPrivileges[automaton] & privilege) != 0;
  }

  /**
   * @notice Counts the numbers of automatons present in this Fast.
   * @return The number of automatons in this marketplace.
   */
  function automatonCount() external view returns (uint256) {
    return LibHasAutomatons.data().automatonSet.values.length;
  }

  /**
   * @notice Paginates the automatons of this Fast based on a starting cursor and a number of records per page.
   * @param cursor is the index at which to start.
   * @param perPage is how many records should be returned at most.
   * @return A `address[]` list of values at most `perPage` big.
   * @return A `uint256` index to the next page.
   */
  function paginateAutomatons(uint256 cursor, uint256 perPage) external view returns (address[] memory, uint256) {
    return LibPaginate.addresses(LibHasAutomatons.data().automatonSet.values, cursor, perPage);
  }

  /**
   * @notice Sets privileges for a given automaton address.
   * @param candidate is the automaton address to which the privileges should be assigned.
   * @param privileges is a bitfield of privileges to apply.
   */
  function setAutomatonPrivileges(address candidate, uint32 privileges) external onlyAutomatonManager(msg.sender) {
    LibHasAutomatons.Data storage ds = LibHasAutomatons.data();
    ds.automatonSet.add(candidate, true);
    ds.automatonPrivileges[candidate] = privileges;
    emit AutomatonPrivilegesSet(candidate, privileges);
  }

  /**
   * @notice Removes an automaton completely.
   * @param candidate is the automaton to remove.
   */
  function removeAutomaton(address candidate) external onlyAutomatonManager(msg.sender) {
    LibHasAutomatons.Data storage ds = LibHasAutomatons.data();
    ds.automatonSet.remove(candidate, false);
    delete ds.automatonPrivileges[candidate];
    emit AutomatonRemoved(candidate);
  }

  /// Modifiers.

  modifier onlyAutomatonManager(address who) {
    if (!isAutomatonsManager(who)) revert RequiresAutomatonsManager(who);
    _;
  }
}
