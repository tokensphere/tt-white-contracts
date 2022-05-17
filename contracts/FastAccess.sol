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

  /// Events.

  event GovernorAdded(address indexed governor);
  event GovernorRemoved(address indexed governor);
  event MemberAdded(address indexed member);
  event MemberRemoved(address indexed member);

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
      initializer
      external {
    // Keep track of the registry.
    reg = pReg;
    // Add the governor both as a governor and as a member.
    memberSet.add(governor, false);
    governorSet.add(governor, false);
    // Emit!
    emit GovernorAdded(governor);
    emit MemberAdded(governor);
  }

  /// Governorship related stuff.

  /**
   * @dev Adds a governor to the governorship list.
   */
  function addGovernor(address payable a)
      spcMembership(msg.sender)
      public override {
    // Add governor to list.
    governorSet.add(a, false);
    // Let the registry provision the new governor with Eth if possible.
    reg.payUpTo(a, GOVERNOR_ETH_PROVISION);
    // Emit!
    emit GovernorAdded(a);
  }

  /**
   * @dev Removes a governor from the governorship list.
   */
  function removeGovernor(address a)
      spcMembership(msg.sender)
      public {
    // Remove governor.
    governorSet.remove(a, false);
    // Emit!
    emit GovernorRemoved(a);
  }

  /**
   * @dev Queries whether a given address is a governor or not.
   */
  function isGovernor(address a)
      public view override returns(bool) {
    return governorSet.contains(a);
  }

  /**
   * @dev Queries the number of governors in the governorship list.
   */
  function governorCount()
      external view returns(uint256) {
    return governorSet.values.length;
  }

  /**
   * @dev Returns a page of governors.
   */
  function paginateGovernors(uint256 index, uint256 perPage)
      public view returns(address[] memory, uint256) {
    return PaginationLib.addresses(governorSet.values, index, perPage);
  }

  /// Membership related stuff.

  /**
   * @dev Adds a member to the membership list.
   */
  function addMember(address payable member)
      governance(msg.sender)
      public override {
    // Add the member.
    memberSet.add(member, false);
    // Let the registry provision the new member with Eth if possible.
    reg.payUpTo(member, MEMBER_ETH_PROVISION);
    // Emit!
    emit MemberAdded(member);
  }

  /**
   * @dev Removes a member from the membership list.
   */
  function removeMember(address a)
      governance(msg.sender)
      public {
    // TODO: Do we need to return the member's tokens to the zero address?
    // We would add a new function in the FastToken contract such as `beforeRemovingMember`
    // only callable from `reg.access()`.
    // In that function we would:
    // - Transfer that member's token back to the ZERO address.
    // - Make sure that the totalSupply is decreased.
    // - Remove all allowances given or received for that member (LOOP?!?!).
    memberSet.remove(a, false);
    emit MemberRemoved(a);
  }

  /**
   * @dev Queries whether a given address is a member or not.
   */
  function isMember(address a)
      public view override returns(bool) {
    return memberSet.contains(a);
  }

  /**
   * @dev Queries the number of members in the membership list.
   */
  function memberCount()
      external view returns(uint256) {
    return memberSet.values.length;
  }

  /**
   * @dev Returns a page of members.
   */
  function paginateMembers(uint256 index, uint256 perPage)
      public view returns(address[] memory, uint256) {
    return PaginationLib.addresses(memberSet.values, index, perPage);
  }

  /// Flags.

  /**
   * @dev Retrieves flags for a given address.
   */
  function flags(address a)
      public view returns(IFastAccess.Flags memory) {
    return
      IFastAccess.Flags({
        isGovernor: isGovernor(a),
        isMember: isMember(a)
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
}
