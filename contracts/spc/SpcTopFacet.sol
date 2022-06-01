// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../lib/LibHelpers.sol';
import '../interfaces/IHasMembers.sol';
import '../fast/FastTopFacet.sol';
import '../fast/FastTokenFacet.sol';
import './lib/ASpcFacet.sol';
import './lib/LibSpc.sol';


/** @title The SPC Smart Contract.
 *  @dev The SPC contract is the central place for top-level governorship. It requires that a
 *        first member address is passed at construction time.
 */
contract SpcTopFacet is ASpcFacet, IHasMembers {
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

  // Eth provisioning stuff.

  /** @dev A function that alllows provisioning this SPC with Eth.
   *  @notice Emits a `EthReceived` event.
   */
  function provisionWithEth()
      external payable {
    require(msg.value > 0, LibConstants.MISSING_ATTACHED_ETH);
    emit EthReceived(msg.sender, msg.value);
  }

  /** @dev A function that alllows draining this SPC from its Eth.
   *  @notice Requires that the caller is a member of this SPC.
   *  @notice Emits a `EthDrained` event.
   */
  function drainEth()
      external
      membership(msg.sender) {
    uint256 amount = payable(address(this)).balance;
    payable(msg.sender).transfer(amount);
    emit EthDrained(msg.sender, amount);
  }

  // Membership management.

  /** @dev Queries whether a given address is a member of this SPC or not.
   *  @param candidate The address to test.
   *  @return A `boolean` flag.
   */
  function isMember(address candidate)
      external override view returns(bool) {
    return LibSpc.data().memberSet.contains(candidate);
  }

  /** @dev Counts the numbers of members present in this SPC.
   *  @return The number of members in this SPC.
   */
  function memberCount()
      external override view returns(uint256) {
    return LibSpc.data().memberSet.values.length;
  }

  /** @dev Paginates the members of this SPC based on a starting cursor and a number of records per page.
   *  @param cursor The index at which to start.
   *  @param perPage How many records should be returned at most.
   *  @return A `address[]` list of values at most `perPage` big.
   *  @return A `uint256` index to the next page.
   */
  function paginateMembers(uint256 cursor, uint256 perPage)
      external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibSpc.data().memberSet.values, cursor, perPage);
  }

  /** @dev Adds a member to this SPC member list.
   *  @param member The address of the member to be added.
   *  @notice Requires that the caller is a member of this SPC.
   *  @notice Emits a `IHasMembers.MemberAdded` event.
   */
  function addMember(address payable member)
      external override
      membership(msg.sender) {
    // Add the member to our list.
    LibSpc.data().memberSet.add(member, false);

    // Provision the member with some Eth.
    uint256 amount = LibHelpers.upTo(member, MEMBER_ETH_PROVISION);
    if (amount != 0) { member.transfer(amount); }

    // Emit!
    emit IHasMembers.MemberAdded(member);
  }

  /** @dev Removes a member from this SPC.
   *  @param member The address of the member to be removed.
   *  @notice Requires that the caller is a member of this SPC.
   *  @notice Emits a `IHasMembers.MemberRemoved` event.
   */
  function removeMember(address member)
      external override
      membership(msg.sender) {
    // No suicide allowed.
    require(msg.sender != member, 'Cannot remove self');
    // Remove the member from the set.
    LibSpc.data().memberSet.remove(member, false);
    // Emit!
    emit IHasMembers.MemberRemoved(member);
  }

  // FAST management related methods.

  /** @dev Queries whether a given address is a known and registered FAST contract.
   * @param fast The address of the contract to check.
   * @return A boolean.
   */
  function isFastRegistered(address fast)
      external view returns(bool) {
    return LibSpc.data().fastSet.contains(fast);
  }

  /** @dev Allows to retrieve the address of a FAST diamond given its symbol.
   *  @param symbol The symbol of the FAST diamond to get the address of.
   *  @return The address of the corresponding FAST diamond, or the Zero Address if not found.
   */
  function fastBySymbol(string calldata symbol)
      external view returns(address) {
    return LibSpc.data().fastSymbols[symbol];
  }

  /** @dev Allows the registration of a given FAST diamond with this SPC.
   *  @param fast The address of the FAST diamond to be registered.
   *  @notice Requires that the caller is a member of this SPC.
   *  @notice Emits a `FastRegistered` event.
   */
  function registerFast(address fast)
      external
      membership(msg.sender) {
    LibSpc.Data storage s = LibSpc.data();
    string memory symbol = FastTokenFacet(fast).symbol();
    require(s.fastSymbols[symbol] == address(0), LibConstants.DUPLICATE_ENTRY);

    // Add the FAST to our list.
    s.fastSet.add(fast, false);
    // Add the fast symbol to our list.
    s.fastSymbols[symbol] = fast;

    // Provision the new fast with Eth.
    uint256 amount = LibHelpers.upTo(payable(fast), FAST_ETH_PROVISION);
    // Only provision the fast if possible.
    if (amount > 0) {
      FastTopFacet(fast).provisionWithEth{ value: amount }();
    }
    // Emit!
    emit FastRegistered(fast);
  }

  /** @dev Counts the number of FAST diamonds registered with this SPC.
   *  @return The number of FAST diamonds registered with this SPC.
   */
  function fastCount()
      external view returns(uint256) {
    return LibSpc.data().fastSet.values.length;
  }

  /** @dev Paginates the FAST diamonds registered with this SPC based on a starting cursor and a number of records per page.
   *  @param cursor The index at which to start.
   *  @param perPage How many records should be returned at most.
   *  @return A `address[]` list of values at most `perPage` big.
   *  @return A `uint256` index to the next page.
   */
  function paginateFasts(uint256 cursor, uint256 perPage)
      external view
      returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibSpc.data().fastSet.values, cursor, perPage);
  }
}
