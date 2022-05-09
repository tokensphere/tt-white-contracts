// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import './FastRegistry.sol';
import './lib/AddressSetLib.sol';
import './lib/PaginationLib.sol';

/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract Spc is Initializable {
  using AddressSetLib for AddressSetLib.Data;

  /// Events.

  event GovernorAdded(address indexed governor);
  event GovernorRemoved(address indexed governor);
  event FastRegistered(FastRegistry indexed registry);

  /// Members.

  // This is where we hold our governors data.
  AddressSetLib.Data private governorSet;
  // This is where we keep our list of deployed fast FASTs.
  address[] private fastRegistries;

  /// Public stuff.

  function initialize(address _governor)
      public
      initializer {
    governorSet.add(_governor);
  }

  /// Governance management.

  function governorCount() external view returns(uint256) {
    return governorSet.values.length;
  }

  function paginateGovernors(uint256 cursor, uint256 perPage)
      external view returns(address[] memory, uint256) {
    return PaginationLib.addresses(governorSet.values, cursor, perPage);
  }

  function isGovernor(address candidate)
      external view returns(bool) {
    return governorSet.contains(candidate);
  }

  function addGovernor(address governor)
      governance
      external {
    // Add the governor to our list.
    governorSet.add(governor);
    // Emit!
    emit GovernorAdded(governor);
  }

  function removeGovernor(address governor)
      governance
      external {
    governorSet.remove(governor);
    emit GovernorRemoved(governor);
  }

  // FAST management related methods.

  function registerFastRegistry(FastRegistry registry)
      governance
      external {
    // Add the FAST Registry to our list.
    fastRegistries.push(address(registry));
    // Emit!
    emit FastRegistered(registry);
  }

  function fastTokenCount()
      external view returns(uint256) {
    return fastRegistries.length;
  }

  function paginateFastTokens(uint256 cursor, uint256 perPage)
      external view
      returns(address[] memory, uint256) {
    return PaginationLib.addresses(fastRegistries, cursor, perPage);
  }

  // Modifiers.

  modifier governance() {
    require(governorSet.contains(msg.sender), 'Missing governorship');
    _;
  }
}