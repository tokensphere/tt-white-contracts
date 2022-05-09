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

  event MemberAdded(address indexed member);
  event MemberRemoved(address indexed member);
  event FastRegistered(FastRegistry indexed registry);

  /// Members.

  // This is where we hold our members data.
  AddressSetLib.Data private memberSet;
  // This is where we keep our list of deployed fast FASTs.
  address[] private fastRegistries;

  /// Public stuff.

  function initialize(address _member)
      public
      initializer {
    memberSet.add(_member);
  }

  /// Governance management.

  function memberCount() external view returns(uint256) {
    return memberSet.values.length;
  }

  function paginateMembers(uint256 cursor, uint256 perPage)
      external view returns(address[] memory, uint256) {
    return PaginationLib.addresses(memberSet.values, cursor, perPage);
  }

  function isMember(address candidate)
      external view returns(bool) {
    return memberSet.contains(candidate);
  }

  function addMember(address member)
      governance
      external {
    // Add the member to our list.
    memberSet.add(member);
    // Emit!
    emit MemberAdded(member);
  }

  function removeMember(address member)
      governance
      external {
    memberSet.remove(member);
    emit MemberRemoved(member);
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
    require(memberSet.contains(msg.sender), 'Missing SPC membership');
    _;
  }
}