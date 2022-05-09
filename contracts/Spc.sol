// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import './lib/AddressSetLib.sol';
import './lib/PaginationLib.sol';

/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract Spc is Initializable {
  using AddressSetLib for AddressSetLib.Data;

  /// Events.

  event GovernorAdded(address indexed governor);
  event GovernorRemoved(address indexed governor);
  event TokenRegistered(address indexed token);

  /// Members.

  // This is where we hold our governors data.
  AddressSetLib.Data governors;
  // This is where we keep our list of deployed fast FASTs.
  address[] fastTokens;

  /// Public stuff.

  function initialize(address _governor)
      public
      initializer {
    governors.add(_governor);
  }

  /// Governance management.

  function governorCount() external view returns(uint256) {
    return governors.values.length;
  }

  function paginateGovernors(uint256 cursor, uint256 perPage)
      external view returns(address[] memory, uint256) {
    return PaginationLib.addresses(governors.values, cursor, perPage);
  }

  function isGovernor(address candidate)
      external view returns(bool) {
    return governors.contains(candidate);
  }

  function addGovernor(address payable governor)
      governance
      external payable {
    // Add the governor to our list.
    governors.add(governor);
    // Immediatelly send the paid ETH to the new governor.
    governor.transfer(msg.value);
    // Emit!
    emit GovernorAdded(governor);
  }

  function removeGovernor(address governor)
      governance
      external {
    governors.remove(governor);
    emit GovernorRemoved(governor);
  }

  // FAST management related methods.

  function fastTokenCount()
      external view returns(uint256) {
    return fastTokens.length;
  }

  function paginateFastTokens(uint256 cursor, uint256 perPage)
      external view
      returns(address[] memory, uint256) {
    return PaginationLib.addresses(fastTokens, cursor, perPage);
  }

  function registerToken(address payable token)
      governance
      external payable {
    // Add the fast token to our list.
    fastTokens.push(token);
    // Immediatelly send the paid ETH to the token contract.
    token.transfer(msg.value);
    // Emit!
    emit TokenRegistered(token);
  }

  // Modifiers.

  modifier governance() {
    require(governors.contains(msg.sender), 'Missing governorship');
    _;
  }
}