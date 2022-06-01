// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './lib/LibAddressSet.sol';
import './lib/LibPaginate.sol';
import './interfaces/IHasMembers.sol';
import './interfaces/IExchange.sol';
import './interfaces/ISpc.sol';


/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract Exchange is IExchange {
  using LibAddressSet for LibAddressSet.Data;

  /// Members.

  // Keep track of where the main SPC is.
  ISpc public spc;

  // This is where we hold our members data.
  LibAddressSet.Data private memberSet;

  constructor(ISpc _spc) {
    _spc = spc;
  }

  /// Membership management.

  function isMember(address candidate)
      external override view returns(bool) {
    return memberSet.contains(candidate);
  }

  function memberCount()
      external override view returns(uint256) {
    return memberSet.values.length;
  }

  function paginateMembers(uint256 cursor, uint256 perPage)
      external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(memberSet.values, cursor, perPage);
  }

  function addMember(address payable member)
      spcMembership(msg.sender)
      external override {
    // Add the member to our list.
    memberSet.add(member, false);
    // Emit!
    emit IHasMembers.MemberAdded(member);
  }

  function removeMember(address member)
      spcMembership(msg.sender)
      external override {
    // Remove member.
    memberSet.remove(member, false);
    // Emit!
    emit IHasMembers.MemberRemoved(member);
  }

  /// Modifiers.

  modifier spcMembership(address a) {
    require(spc.isMember(a), 'Missing SPC membership');
    _;
  }
}
