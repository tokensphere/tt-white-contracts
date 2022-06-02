// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './interfaces/ISpc.sol';
import './lib/LibAddressSet.sol';
import './lib/LibPaginate.sol';
import './lib/LibHelpers.sol';
import './Fast/FastFacet.sol';
import './Fast/FastTokenFacet.sol';

/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract Spc is ISpc {
  using LibAddressSet for LibAddressSet.Data;

  /// Constants.

  // This represents how much Eth we provision new SPC members with.
  uint256 constant private MEMBER_ETH_PROVISION = 10 ether;
  // This represents how much Eth new FASTs are provisioned with.
  uint256 constant private FAST_ETH_PROVISION = 250 ether;

  /// Events.

  // FAST related events.
  event FastRegistered(address indexed fast);
  // Eth provisioning related events.
  event EthReceived(address indexed from, uint256 amount);
  event EthDrained(address indexed to, uint256 amount);

  /// Members.

  // This is where we hold our members data.
  LibAddressSet.Data private memberSet;
  // This is where we keep our list of deployed fast FASTs.
  address[] private fasts;
  // We keep track of the FAST symbols that were already used.
  mapping(string => address) private fastSymbols;

  constructor (address _firstMember) {
    // Add member to our list.
    memberSet.add(_firstMember, false);
    // Emit!
    emit IHasMembers.MemberAdded(_firstMember);
  }

  /// Eth provisioning stuff.

  function provisionWithEth()
      external payable {
    require(msg.value > 0, 'Missing attached ETH');
    emit EthReceived(msg.sender, msg.value);
  }

  function drainEth()
      membership(msg.sender)
      external {
    uint256 amount = address(this).balance;
    payable(msg.sender).transfer(amount);
    emit EthDrained(msg.sender, amount);
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
      membership(msg.sender)
      external override {
    // Add the member to our list.
    memberSet.add(member, false);

    // Provision the member with some Eth.
    uint256 amount = LibHelpers.upTo(member, MEMBER_ETH_PROVISION);
    if (amount != 0) { member.transfer(amount); }

    // Emit!
    emit IHasMembers.MemberAdded(member);
  }

  function removeMember(address member)
      membership(msg.sender)
      external override {
    // Remove the member from the set.
    memberSet.remove(member, false);
    // Emit!
    emit IHasMembers.MemberRemoved(member);
  }

  /// FAST management related methods.

  function fastBySymbol(string calldata symbol)
      external view returns(address) {
    return fastSymbols[symbol];
  }

  function registerFast(address fast)
      membership(msg.sender)
      external {
    string memory symbol = FastTokenFacet(fast).symbol();
    require(fastSymbols[symbol] == address(0), 'Symbol already taken');

    // Add the FAST Registry to our list.
    fasts.push(fast);
    // Add the fast symbol to our list.
    fastSymbols[symbol] = fast;

    // Provision the new fast with Eth.
    FastFacet(fast).provisionWithEth{ value: LibHelpers.upTo(fast, FAST_ETH_PROVISION) }();
    // Emit!
    emit FastRegistered(fast);
  }

  function fastRegistryCount()
      external view returns(uint256) {
    return fasts.length;
  }

  function paginateFastRegistries(uint256 cursor, uint256 perPage)
      external view
      returns(address[] memory, uint256) {
    return LibPaginate.addresses(fasts, cursor, perPage);
  }

  /// Modifiers.

  modifier membership(address a) {
    require(memberSet.contains(a), 'Missing SPC membership');
    _;
  }
}