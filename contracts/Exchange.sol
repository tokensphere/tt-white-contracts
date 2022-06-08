// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './lib/LibAddressSet.sol';
import './lib/LibPaginate.sol';
import './interfaces/IHasMembers.sol';
import './Fast/lib/LibFast.sol';
import './Spc.sol';


/** @title The Exchange Smart Contract.
 *  @dev The exchange contract is in charge of keeping track of exchange members and has logic
 *  related to trading.
 *  It requires an SPC contract instance at construct-time, as it relies on SPC membership
 *  to permission governance functions.
 */
contract Exchange is IHasMembers {
  using LibAddressSet for LibAddressSet.Data;

  // Members.

  /// @dev The internal pointer to the SPC contract.
  Spc public spc;

  // This is where we hold our members data.
  LibAddressSet.Data private memberSet;

  /** @dev Designated constructor.
   *  @param _spc is the address of the SPC contract to work with.
   */
  constructor(Spc _spc) {
    spc = _spc;
  }

  // Membership management.

  /** @dev Queries whether a given address is a member of this Exchange or not.
   *  @param _candidate is the address to test.
   *  @return A `boolean` flag.
   */
  function isMember(address _candidate)
      external override view returns(bool) {
    return memberSet.contains(_candidate);
  }

  /** @dev Counts the numbers of members present in this Exchange.
   *  @return The number of members in this exchange.
   */
  function memberCount()
      external override view returns(uint256) {
    return memberSet.values.length;
  }

  /** @dev Paginates the members of this Exchange based on a starting cursor and a number of records per page.
   *  @param _cursor is the index at which to start.
   *  @param _perPage is how many records should be returned at most.
   *  @return A `address[]` list of values at most `perPage` big.
   *  @return A `uint256` index to the next page.
   */
  function paginateMembers(uint256 _cursor, uint256 _perPage)
      external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(memberSet.values, _cursor, _perPage);
  }

  /** @dev Adds a member to this Exchange member list.
   *  @param _member is the address of the member to be added.
   *  @notice Requires that the caller is a member of the linked SPC.
   *  @notice Emits a `IHasMembers.MemberAdded` event.
   */
  function addMember(address payable _member)
      spcMembership(msg.sender)
      external override {
    // Add the member to our list.
    memberSet.add(_member, false);
    // Emit!
    emit IHasMembers.MemberAdded(_member);
  }

  /** @dev Removes a member from this Exchange.
   *  @param _member is the address of the member to be removed.
   *  @notice Requires that the caller is a member of the linked SPC.
   *  @notice Emits a `IHasMembers.MemberRemoved` event.
   */
  function removeMember(address _member)
      spcMembership(msg.sender)
      external override {
    // Remove member.
    memberSet.remove(_member, false);
    // Emit!
    emit IHasMembers.MemberRemoved(_member);
  }

  // Modifiers.

  /** @dev Requires that the given address is a member of the linked SPC.
   *  @param _candidate is the address to be checked.
   */
  modifier spcMembership(address _candidate) {
    require(spc.isMember(_candidate), LibFast.REQUIRES_SPC_MEMBERSHIP);
    _;
  }
}
