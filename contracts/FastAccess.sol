// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import './interfaces/IFastAccess.sol';
import './FastRegistry.sol';
import './lib/AddressSetLib.sol';
import './lib/PaginationLib.sol';


/// @custom:oz-upgrades-unsafe-allow external-library-linking
/**
* @dev The FAST Access Smart Contract is the source of truth when it comes to
* permissioning and ACLs within a given FAST network.
*/
/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract FastAccess is Initializable, IFastAccess {
  using AddressSetLib for AddressSetLib.Data;

  /// Constants.

  // This represents how much Eth we provision new governors with.
  uint256 constant private GOVERNOR_ETH_PROVISION = 10 ether;
  // This represents how much Eth we provision new members with.
  uint256 constant private MEMBER_ETH_PROVISION = 1 ether;

  /// Members.

  /// @dev This is where the parent SPC is deployed.
  FastRegistry public reg;

  /// @dev We hold list of governors in here.
  AddressSetLib.Data private governorSet;
  /// @dev We keep the list of members in here.
  AddressSetLib.Data private memberSet;

  /// Public stuff.

  /**
  * @dev Designated initializer - replaces the constructor as we are
  * using the proxy pattern allowing for logic upgrades.
  */
  function initialize(FastRegistry pReg, address governor)
      external initializer {
    // Keep track of the registry.
    reg = pReg;
    // Add the governor both as a governor and as a member.
    memberSet.add(governor, false);
    governorSet.add(governor, false);
    // Emit!
    emit IHasGovernors.GovernorAdded(governor);
    emit IHasMembers.MemberAdded(governor);
  }

  /// Governorship related stuff.

  /**
   * @dev Queries whether a given address is a governor or not.
   */
  function isGovernor(address a)
      external view override returns(bool) {
    return governorSet.contains(a);
  }

  /**
   * @dev Queries the number of governors in the governorship list.
   */
  function governorCount()
      external override view returns(uint256) {
    return governorSet.values.length;
  }

  /**
   * @dev Returns a page of governors.
   */
  function paginateGovernors(uint256 index, uint256 perPage)
      external override view returns(address[] memory, uint256) {
    return PaginationLib.addresses(governorSet.values, index, perPage);
  }

  /**
   * @dev Adds a governor to the governorship list.
   */
  function addGovernor(address payable a)
      spcMembership(msg.sender)
      external override {
    // Add governor to list.
    governorSet.add(a, false);
    // Let the registry provision the new governor with Eth if possible.
    reg.payUpTo(a, GOVERNOR_ETH_PROVISION);
    // Emit!
    emit IHasGovernors.GovernorAdded(a);
  }

  /**
   * @dev Removes a governor from the governorship list.
   */
  function removeGovernor(address a)
      spcMembership(msg.sender)
      external override {
    // Remove governor.
    governorSet.remove(a, false);
    // Emit!
    emit IHasGovernors.GovernorRemoved(a);
  }

  /// Membership related stuff.

  /**
   * @dev Queries whether a given address is a member or not.
   */
  function isMember(address a)
      external override view returns(bool) {
    return memberSet.contains(a);
  }

  /**
   * @dev Queries the number of members in the membership list.
   */
  function memberCount()
      external override view returns(uint256) {
    return memberSet.values.length;
  }

  /**
   * @dev Returns a page of members.
   */
  function paginateMembers(uint256 index, uint256 perPage)
      external override view returns(address[] memory, uint256) {
    return PaginationLib.addresses(memberSet.values, index, perPage);
  }

  /**
   * @dev Adds a member to the membership list.
   */
  function addMember(address payable member)
      governance(msg.sender)
      external override {
    // Add the member.
    memberSet.add(member, false);
    // Let the registry provision the new member with Eth if possible.
    reg.payUpTo(member, MEMBER_ETH_PROVISION);
    // Emit!
    emit IHasMembers.MemberAdded(member);
  }

  /**
   * @dev Removes a member from the membership list.
   */
  function removeMember(address member)
      governance(msg.sender) membership(member)
      external override {
    // Notify token contract.
    reg.token().beforeRemovingMember(member);
    // Remove member.
    memberSet.remove(member, false);
    // Emit!
    emit IHasMembers.MemberRemoved(member);
  }

  /// Flags.

  /**
   * @dev Retrieves flags for a given address.
   */
  function flags(address a)
      external view returns(IFastAccess.Flags memory) {
    return
      IFastAccess.Flags({
        isGovernor: governorSet.contains(a),
        isMember: memberSet.contains(a)
      });
  }

  // Modifiers.

  modifier spcMembership(address a) {
    require(reg.spc().isMember(a), 'Missing SPC membership');
    _;
  }

  modifier governance(address a) {
    require(governorSet.contains(a), 'Missing governorship');
    _;
  }

  modifier membership(address a) {
    require(memberSet.contains(a), 'Missing membership');
    _;
  }
}
