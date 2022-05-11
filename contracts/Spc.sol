// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import './FastRegistry.sol';
import './lib/AddressSetLib.sol';
import './lib/PaginationLib.sol';

/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract Spc is Initializable {
  using AddressSetLib for AddressSetLib.Data;

  /// Constants.

  // This represents how much Eth we provision new SPC members with.
  uint256 constant private MEMBER_ETH_PROVISION = 10 ether;
  // This represents how much Eth new FAST registries are provisioned with.
  uint256 constant private FAST_ETH_PROVISION = 100 ether;

  /// Events.

  // Membership related events.
  event MemberAdded(address indexed member);
  event MemberRemoved(address indexed member);
  // Fast registry related events.
  event FastRegistered(FastRegistry indexed reg);
  // Eth provisioning related events.
  event EthReceived(address indexed from, uint256 amount);
  event EthDrained(address indexed to, uint256 amount);

  /// Members.

  // This is where we hold our members data.
  AddressSetLib.Data private memberSet;
  // This is where we keep our list of deployed fast FASTs.
  address[] private fastRegistries;
  // We keep track of the FAST symbols that were already used.
  mapping(string => IFastRegistry) private fastSymbols;

  /// Designated nitializer - we do not want a constructor!

  function initialize(address _member)
      public payable
      initializer {
    memberSet.add(_member);
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

  function addMember(address payable member)
      membership(msg.sender)
      external {
    // Add the member to our list.
    memberSet.add(member);
    // Provision the member with some Eth.
    ensureEthProvisioning(member, MEMBER_ETH_PROVISION);
    // Emit!
    emit MemberAdded(member);
  }

  function removeMember(address member)
      membership(msg.sender)
      external {
    // Remove the member from the set.
    memberSet.remove(member);
    // TODO: Do we need to return the member's tokens to the zero address?
    // Emit!
    emit MemberRemoved(member);
  }

  // FAST management related methods.

  function checkSymbolAvailability(string memory symbol)
    public view returns(bool) {
      return fastSymbols[symbol] == IFastRegistry(address(0));
    }

  function registerFastRegistry(FastRegistry reg)
      membership(msg.sender)
      external {
    string memory symbol = reg.token().symbol();
    require(fastSymbols[symbol] == IFastRegistry(address(0)), 'Symbol already taken');
    // Add the FAST Registry to our list.
    fastRegistries.push(address(reg));
    // Add the fast symbol to our list.
    fastSymbols[symbol] = reg;
    // Provision the new fast with Eth.
    reg.provisionWithEth{ value: FAST_ETH_PROVISION }();
    // Emit!
    emit FastRegistered(reg);
  }

  function fastRegistryCount()
      external view returns(uint256) {
    return fastRegistries.length;
  }

  function paginateFastRegistries(uint256 cursor, uint256 perPage)
      external view
      returns(address[] memory, uint256) {
    return PaginationLib.addresses(fastRegistries, cursor, perPage);
  }

  /// Private.

  function ensureEthProvisioning(address payable a, uint256 amount)
      private {
    uint256 available = address(this).balance;
    // If this contract is storing less than the amount, cap the amount.
    if (amount > available) { amount = available; }
    // If the recipient has more than the amount, don't do anything.
    if (a.balance >= amount) { return; }
    // Otherwise, cap the amount to the missing part from the recipient's balance.
    amount = amount - a.balance;
    // Transfer some eth!
    a.transfer(amount);
  }

  /// Modifiers.

  modifier membership(address a) {
    require(memberSet.contains(a), 'Missing SPC membership');
    _;
  }
}