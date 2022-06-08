// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './lib/LibAddressSet.sol';
import './lib/LibPaginate.sol';
import './lib/LibHelpers.sol';
import './interfaces/IHasMembers.sol';
import './Fast/FastFacet.sol';
import './Fast/FastTokenFacet.sol';


/** @title The SPC Smart Contract.
 *  @dev The SPC contract is the central place for top-level governorship. It requires that a
 *        first member address is passed at construction time.
 */
contract Spc is IHasMembers {
  using LibAddressSet for LibAddressSet.Data;

  // Constants.

  // This represents how much Eth we provision new SPC members with.
  uint256 constant private MEMBER_ETH_PROVISION = 10 ether;
  // This represents how much Eth new FASTs are provisioned with.
  uint256 constant private FAST_ETH_PROVISION = 250 ether;

  // Events.

  /** @dev Emited when a new FAST is registered.
   *  @param fast The address of the newly registered FAST diamond.
   */
  event FastRegistered(address indexed fast);

  /** @dev Emited when someone provisions this SPC with Eth.
   *  @param from The sender of the Eth.
   *  @param amount The quantity of Eth, expressed in Wei.
   */
  event EthReceived(address indexed from, uint256 amount);
  /** @dev Emited when Eth is drained from this SPC.
   *  @param to The caller and recipient of the drained Eth.
   *  @param amount The quantity of Eth that was drained, expressed in Wei.
   */
  event EthDrained(address indexed to, uint256 amount);

  // Members.

  // This is where we hold our members data.
  LibAddressSet.Data private memberSet;
  // This is where we keep our list of deployed fast FASTs.
  address[] private fasts;
  // We keep track of the FAST symbols that were already used.
  mapping(string => address) private fastSymbols;

  /** @dev The SPC designated constructor, requires a member address to be passed.
   *  @param _member The first member of to be addded to this SPC.
   *  @notice Emits a `IHasMembers.MemberAdded` event.
   */
  constructor (address _member) {
    // Add member to our list.
    memberSet.add(_member, false);
    // Emit!
    emit IHasMembers.MemberAdded(_member);
  }

  // Eth provisioning stuff.

  /** @dev A function that alllows provisioning this SPC with Eth.
   *  @notice Emits a `EthReceived` event.
   */
  function provisionWithEth()
      external payable {
    require(msg.value > 0, 'Missing attached ETH');
    emit EthReceived(msg.sender, msg.value);
  }

  /** @dev A function that alllows draining this SPC from its Eth.
   *  @notice Requires that the caller is a member of this SPC.
   *  @notice Emits a `EthDrained` event.
   */
  function drainEth()
      external
      membership(msg.sender) {
    uint256 amount = address(this).balance;
    payable(msg.sender).transfer(amount);
    emit EthDrained(msg.sender, amount);
  }

  // Membership management.

  /** @dev Queries whether a given address is a member of this SPC or not.
   *  @param _candidate The address to test.
   *  @return A `boolean` flag.
   */
  function isMember(address _candidate)
      external override view returns(bool) {
    return memberSet.contains(_candidate);
  }

  /** @dev Counts the numbers of members present in this SPC.
   *  @return The number of members in this SPC.
   */
  function memberCount()
      external override view returns(uint256) {
    return memberSet.values.length;
  }

  /** @dev Paginates the members of this SPC based on a starting cursor and a number of records per page.
   *  @param _cursor The index at which to start.
   *  @param _perPage How many records should be returned at most.
   *  @return A `address[]` list of values at most `perPage` big.
   *  @return A `uint256` index to the next page.
   */
  function paginateMembers(uint256 _cursor, uint256 _perPage)
      external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(memberSet.values, _cursor, _perPage);
  }

  /** @dev Adds a member to this SPC member list.
   *  @param _member The address of the member to be added.
   *  @notice Requires that the caller is a member of this SPC.
   *  @notice Emits a `IHasMembers.MemberAdded` event.
   */
  function addMember(address payable _member)
      external override
      membership(msg.sender) {
    // Add the member to our list.
    memberSet.add(_member, false);

    // Provision the member with some Eth.
    uint256 amount = LibHelpers.upTo(_member, MEMBER_ETH_PROVISION);
    if (amount != 0) { _member.transfer(amount); }

    // Emit!
    emit IHasMembers.MemberAdded(_member);
  }

  /** @dev Removes a member from this SPC.
   *  @param _member The address of the member to be removed.
   *  @notice Requires that the caller is a member of this SPC.
   *  @notice Emits a `IHasMembers.MemberRemoved` event.
   */
  function removeMember(address _member)
      external override
      membership(msg.sender) {
    // Remove the member from the set.
    memberSet.remove(_member, false);
    // Emit!
    emit IHasMembers.MemberRemoved(_member);
  }

  // FAST management related methods.

  /** @dev Allows to retrieve the address of a FAST diamond given its symbol.
   *  @param _symbol The symbol of the FAST diamond to get the address of.
   *  @return The address of the corresponding FAST diamond, or the Zero Address if not found.
   */
  function fastBySymbol(string calldata _symbol)
      external view returns(address) {
    return fastSymbols[_symbol];
  }

  /** @dev Allows the registration of a given FAST diamond with this SPC.
   *  @param _fast The address of the FAST diamond to be registered.
   *  @notice Requires that the caller is a member of this SPC.
   *  @notice Emits a `FastRegistered` event.
   */
  function registerFast(address _fast)
      external
      membership(msg.sender) {
    string memory symbol = FastTokenFacet(_fast).symbol();
    require(fastSymbols[symbol] == address(0), 'Symbol already taken');

    // Add the FAST to our list.
    fasts.push(_fast);
    // Add the fast symbol to our list.
    fastSymbols[symbol] = _fast;

    // Provision the new fast with Eth.
    uint256 howMuch = LibHelpers.upTo(_fast, FAST_ETH_PROVISION);
    FastFacet(_fast).provisionWithEth{ value: howMuch }();
    // Emit!
    emit FastRegistered(_fast);
  }

  /** @dev Counts the number of FAST diamonds registered with this SPC.
   *  @return The number of FAST diamonds registered with this SPC.
   */
  function fastCount()
      external view returns(uint256) {
    return fasts.length;
  }

  /** @dev Paginates the FAST diamonds registered with this SPC based on a starting cursor and a number of records per page.
   *  @param _cursor The index at which to start.
   *  @param _perPage How many records should be returned at most.
   *  @return A `address[]` list of values at most `perPage` big.
   *  @return A `uint256` index to the next page.
   */
  function paginateFasts(uint256 _cursor, uint256 _perPage)
      external view
      returns(address[] memory, uint256) {
    return LibPaginate.addresses(fasts, _cursor, _perPage);
  }

  // Modifiers.

  /** @dev Requires that the given address is a member of this SPC.
   *  @param _candidate is the address to be checked.
   */
  modifier membership(address _candidate) {
    require(memberSet.contains(_candidate), 'Missing SPC membership');
    _;
  }
}