// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './lib/index.sol';
import '../interfaces/IHasMembers.sol';
import '../interfaces/IHasGovernors.sol';
import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import './FastTokenFacet.sol';
import './interfaces/AFastFacet.sol';


/**
* @dev The FAST Access Smart Contract is the source of truth when it comes to
* permissioning and ACLs within a given FAST network.
*/
contract FastAccessFacet is AFastFacet, IHasMembers, IHasGovernors {
  using LibAddressSet for LibAddressSet.Data;
  /// Structs.

  /**
   * @dev This structure isn't used anywhere in storage. Instead, it
   * allows various methods of the contract to return all the flags
   * associated with a given address in one go.
   */
  struct Flags {
    bool isGovernor;
    bool isMember;
  }

  /// Constants.

  // This represents how much Eth we provision new governors with.
  uint256 constant private GOVERNOR_ETH_PROVISION = 10 ether;
  // This represents how much Eth we provision new members with.
  uint256 constant private MEMBER_ETH_PROVISION = 1 ether;

  /// Governorship related stuff.

  /**
   * @dev Queries whether a given address is a governor or not.
   */
  function isGovernor(address a)
      external view override returns(bool) {
    return LibFastAccess.data().governorSet.contains(a);
  }

  /**
   * @dev Queries the number of governors in the governorship list.
   */
  function governorCount()
      external override view returns(uint256) {
    return LibFastAccess.data().governorSet.values.length;
  }

  /**
   * @dev Returns a page of governors.
   */
  function paginateGovernors(uint256 index, uint256 perPage)
      external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibFastAccess.
      data().governorSet.values,
      index,
      perPage
    );
  }

  /**
   * @dev Adds a governor to the governorship list.
   */
  function addGovernor(address payable a)
      external override
      spcMembership(msg.sender) {
    // Add governor to list.
    LibFastAccess.data().governorSet.add(a, false);
    // Provision the new governor with Eth if possible.
    LibFast.payUpTo(a, GOVERNOR_ETH_PROVISION);
    // Emit!
    emit IHasGovernors.GovernorAdded(a);
  }

  /**
   * @dev Removes a governor from the governorship list.
   */
  function removeGovernor(address a)
      external override
      spcMembership(msg.sender) {
    // Remove governor.
    LibFastAccess.data().governorSet.remove(a, false);
    // Emit!
    emit IHasGovernors.GovernorRemoved(a);
  }

  /// Membership related stuff.

  /**
   * @dev Queries whether a given address is a member or not.
   */
  function isMember(address a)
      external override view returns(bool) {
    return LibFastAccess.data().memberSet.contains(a);
  }

  /**
   * @dev Queries the number of members in the membership list.
   */
  function memberCount()
      external override view returns(uint256) {
    return LibFastAccess.data().memberSet.values.length;
  }

  /**
   * @dev Returns a page of members.
   */
  function paginateMembers(uint256 index, uint256 perPage)
      external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(
      LibFastAccess.data().memberSet.values,
      index,
      perPage
    );
  }

  /**
   * @dev Adds a member to the membership list.
   */
  function addMember(address payable member)
      external override 
      governance(msg.sender) {
    // Add the member.
    LibFastAccess.data().memberSet.add(member, false);
    // Let the registry provision the new member with Eth if possible.
    LibFast.payUpTo(member, MEMBER_ETH_PROVISION);
    // Emit!
    emit IHasMembers.MemberAdded(member);
  }

  /**
   * @dev Removes a member from the membership list.
   */
  function removeMember(address member)
      external override 
      governance(msg.sender) {
    // Notify token contract.
    FastTokenFacet(address(this)).beforeRemovingMember(member);
    // Remove member.
    LibFastAccess.data().memberSet.remove(member, false);
    // Emit!
    emit IHasMembers.MemberRemoved(member);
  }

  /// Flags.

  /**
   * @dev Retrieves flags for a given address.
   */
  function flags(address a)
      external view returns(Flags memory) {
    LibFastAccess.Data storage s = LibFastAccess.data();
    return
      Flags({
        isGovernor: s.governorSet.contains(a),
        isMember: s.memberSet.contains(a)
      });
  }
}
