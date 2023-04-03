// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../common/lib/LibHasGovernors.sol';
import '../interfaces/ICustomErrors.sol';


/**
 * @title The Fast Smart Contract.
 * @notice The Fast Governors facet is in charge of keeping track of automaton accounts.
 */
abstract contract AHasGovernors {
  using LibAddressSet for LibAddressSet.Data;

  /// Errors.

  error RequiresGovernorsManager(address who);
  error RequiresValidGovernor(address who);

  /// Events.

  /**
   * @notice Emited when a governor is added to the implementing contract.
   * @param governor is the address of the added governor.
   */
  event GovernorAdded(address indexed governor);
  /**
   * @notice Emited when a governor is removed to the implementing contract.
   * @param governor is the address of the removed member.
   */
  event GovernorRemoved(address indexed governor);

  // Must be overriden.
  function isGovernorsManager(address who)
      virtual internal view
      returns(bool);

  // Must be overriden.
  function isValidGovernor(address who)
      virtual internal view
      returns(bool);

  // May be overriden.
  function onGovernorAdded(address governor)
      virtual internal {}
  
  // May be overriden.
  function onGovernorRemoved(address governor)
      virtual internal {}
  
  // Governors management.

  /**
   * @notice Queries whether a given address is a governor or not.
   * @param who is the address to test.
   * @return A `bool` equal to `true` when `candidate` is a governor.
   */
  function isGovernor(address who)
      external view returns(bool) {
    return LibHasGovernors.data().governorSet.contains(who);
  }

  /**
   * @notice Queries the number of governors.
   * @return An `uint256`.
   */
  function governorCount()
      external view returns(uint256) {
    return LibHasGovernors.data().governorSet.values.length;
  }

  /**
   * @notice Queries pages of governors based on a start index and a page size.
   * @param index is the offset at which the pagination operation should start.
   * @param perPage is how many items should be returned.
   * @return A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page.
   */
  function paginateGovernors(uint256 index, uint256 perPage)
      external view returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibHasGovernors.data().governorSet.values, index, perPage);
  }

  /**
   * @notice Adds a governor to the list of known governors.
   * @param who is the address to be added.
   */
  function addGovernor(address payable who)
      external 
      onlyGovernorManager(msg.sender) onlyValidGovernor(who) {
    // Add the governor.
    LibHasGovernors.data().governorSet.add(who, false);
    // Notify via callback.
    onGovernorAdded(who);
    // Emit!
    emit GovernorAdded(who);
  }

  /**
   * @notice Removes a governor from this contract.
   * @param governor The address of the governor to be removed.
   * @notice Requires that the caller is a governor of this Issuer.
   * @notice Emits a `AHasGovernors.GovernorRemoved` event.
   */
  function removeGovernor(address governor)
      external 
      onlyGovernorManager(msg.sender) {
    // Notify via callback.
    onGovernorRemoved(governor);
    // Remove governor.
    LibHasGovernors.data().governorSet.remove(governor, false);
    // Emit!
    emit GovernorRemoved(governor);
  }

  /// Modifiers.

  modifier onlyGovernorManager(address who) {
    if (!isGovernorsManager(who))
      revert RequiresGovernorsManager(who);
    _;
  }

  modifier onlyValidGovernor(address who) {
    if (!isValidGovernor(who))
      revert RequiresValidGovernor(who);
    _;
  }
}
