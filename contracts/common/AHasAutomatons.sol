// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../interfaces/IHasAutomatons.sol';
import '../common/lib/LibAutomatons.sol';
import '../interfaces/ICustomErrors.sol';


/**
 * @title The Fast Smart Contract.
 * @notice The Fast Automatons facet is in charge of keeping track of automaton accounts.
 */
abstract contract AHasAutomatons is IHasAutomatons {
  using LibAddressSet for LibAddressSet.Data;

  // These must be overriden.
  modifier onlyIssuerMember() virtual;

  // Automatons management.

  /**
   * @notice Queries whether a given address is an automaton for this Fast or not.
   * @param candidate is the address to test.
   * @return A `boolean` flag.
   */
  function isAutomaton(address candidate)
      external override view returns(bool) {
    return LibAutomatons.data().automatonSet.contains(candidate);
  }

  /**
   * @notice Returns the privileges for a given automaton address, or zero if no privileges exist.
   * @param automaton is the address to test.
   * @return An `uint256` bitfield.
   */
  function automatonPrivileges(address automaton)
      external override view returns(uint256) {
    return LibAutomatons.data().automatonPrivileges[automaton];
  }

  /**
   * @notice Counts the numbers of automatons present in this Fast.
   * @return The number of automatons in this marketplace.
   */
  function automatonCount()
      external override view returns(uint256) {
    return LibAutomatons.data().automatonSet.values.length;
  }

  /**
   * @notice Paginates the automatons of this Fast based on a starting cursor and a number of records per page.
   * @param cursor is the index at which to start.
   * @param perPage is how many records should be returned at most.
   * @return A `address[]` list of values at most `perPage` big.
   * @return A `uint256` index to the next page.
   */
  function paginateAutomatons(uint256 cursor, uint256 perPage)
    external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(
      LibAutomatons.data().automatonSet.values,
      cursor,
      perPage
    );
  }

  /**
   * @notice Sets privileges for a given automaton address.
   * @param candidate is the automaton address to which the privileges should be assigned.
   * @param privileges is a bitfield of privileges to apply.
   */
  function setAutomatonPrivileges(address candidate, uint256 privileges)
      external override onlyIssuerMember {
    LibAutomatons.Data storage ds = LibAutomatons.data();
    ds.automatonSet.add(candidate, true);
    ds.automatonPrivileges[candidate] = privileges;
    // emit AutomatonPrivilegesSet(candidate, privileges);
  }

  /**
   * @notice Removes an automaton completely.
   * @param candidate is the automaton to remove.
   */
  function removeAutomaton(address candidate)
      external override onlyIssuerMember {
    LibAutomatons.Data storage ds = LibAutomatons.data();
    ds.automatonSet.remove(candidate, false);
    delete ds.automatonPrivileges[candidate];
    // emit AutomatonRemoved(candidate);
  }
}
