// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./lib/AddressSetLib.sol";

/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract Spc is Initializable {
  using AddressSetLib for AddressSetLib.Data;
  using AddressSetLib for AddressSetLib.Data;

  /// Events.

  event GovernorAdded(address indexed governor);
  event GovernorRemoved(address indexed governor);
  event TokenRegistered(address indexed token);

  /// Members.

  // This is where we hold our governors data.
  AddressSetLib.Data private governors;
  // This is where we keep our list of deployed fast FASTs.
  address[] private fastTokens;

  /// Public stuff.

  function initialize(address _governor)
      public
      initializer {
    governors.add(_governor);
  }

  /// Governance management.

  function governorCount() external view returns(uint256) {
    return governors.count();
  }

  function governorAt(uint256 index) external view returns(address) {
    (address[] memory governor, /*cursor*/) = governorsAt(index, 1);
    return governor[0];
  }

  function governorsAt(uint256 cursor, uint256 perPage)
    public view returns(address[] memory values, uint256 newCursor) {
      uint256 count = governors.values.length;
      uint256 length = perPage;
      if (length > count - cursor) {
          length = count - cursor;
      }
      values = new address[](length);
      for (uint256 i = 0; i < length; i++) {
          values[i] = governors.values[cursor + i];
      }
      return (values, cursor + length);
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

  function fastTokenAt(uint256 index)
    external view returns(address) {
    return fastTokens[index];
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