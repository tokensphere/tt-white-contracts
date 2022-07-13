// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../interfaces/IHasMembers.sol';
import '../interfaces/IHasGovernors.sol';
import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../exchange/ExchangeAccessFacet.sol';
import './FastTokenFacet.sol';
import './lib/AFastFacet.sol';
import './lib/LibFast.sol';
import './lib/LibFastAccess.sol';
import './FastTopFacet.sol';
import './FastFrontendFacet.sol';


/**
* @dev The FAST Access Smart Contract is the source of truth when it comes to
* permissioning and ACLs within a given FAST network.
*/
contract FastAccessFacet is AFastFacet, IHasMembers, IHasGovernors {
  using LibAddressSet for LibAddressSet.Data;
  // Structs.

  /**
   * @dev This structure isn't used anywhere in storage. Instead, it
   * allows various methods of the contract to return all the flags
   * associated with a given address in one go.
   */
  struct Flags {
    bool isGovernor;
    bool isMember;
  }

  // Constants.

  // This represents how much Eth we provision new governors with.
  uint256 constant private GOVERNOR_ETH_PROVISION = 10 ether;
  // This represents how much Eth we provision new members with.
  uint256 constant private MEMBER_ETH_PROVISION = 1 ether;

  // Governorship related stuff.

  /**
   * @dev Queries whether a given address is a governor or not.
   */
  function isGovernor(address candidate)
      external view override returns(bool) {
    return LibFastAccess.data().governorSet.contains(candidate);
  }

  /**
   * @dev Queries the number of governors in the governor list.
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
   * @dev Adds a governor to the governor list.
   */
  function addGovernor(address payable governor)
      external override
      onlySpcMember {
    // Add governor to list.
    LibFastAccess.data().governorSet.add(governor, false);
    // If the address is a regular wallet...
    if (!LibHelpers.isContract(governor)) {
      // Provision the new governor with Eth if possible.
      FastTopFacet(payable(address(this))).payUpTo(governor, GOVERNOR_ETH_PROVISION);
    }
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
    emit GovernorAdded(governor);
  }

  /**
   * @dev Removes a governor from the governor list.
   */
  function removeGovernor(address governor)
      external override
      onlySpcMember {
    // Remove governor.
    LibFastAccess.data().governorSet.remove(governor, false);
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
    emit GovernorRemoved(governor);
  }

  /// Membership related stuff.

  /**
   * @dev Queries whether a given address is a member or not.
   */
  function isMember(address candidate)
      external override view returns(bool) {
    return LibFastAccess.data().memberSet.contains(candidate);
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
      onlyGovernor(msg.sender) onlyExchangeMember(member) {
    // Add the member.
    LibFastAccess.data().memberSet.add(member, false);
    // If the address is a regular wallet...
    if (!LibHelpers.isContract(member)) {
      // Provision the new member with Eth if possible.
      FastTopFacet(payable(address(this))).payUpTo(member, MEMBER_ETH_PROVISION);
    }
    // Notify exchange that this member was added to this FAST.
    ExchangeAccessFacet(LibFast.data().exchange).memberAddedToFast(member);
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
    emit MemberAdded(member);
  }

  /**
   * @dev Removes a member from the membership list.
   */
  function removeMember(address member)
      external override 
      onlyGovernor(msg.sender) {
    // Remove member.
    LibFastAccess.data().memberSet.remove(member, false);
    // Notify token facet that this member was removed.
    FastTokenFacet(address(this)).beforeRemovingMember(member);
    // Notify exchange that this member was removed from this FAST.
    ExchangeAccessFacet(LibFast.data().exchange).memberRemovedFromFast(member);
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
    emit MemberRemoved(member);
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
