// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../issuer/IssuerTopFacet.sol';
import '../interfaces/ICustomErrors.sol';
import '../interfaces/IHasMembers.sol';
import '../interfaces/IHasActiveMembers.sol';
import '../interfaces/IHasAutomatons.sol';
import './lib/LibMarketplaceAccess.sol';
import './lib/LibMarketplaceAutomatons.sol';
import './lib/AMarketplaceFacet.sol';


/**
 * @title The Marketplace Smart Contract.
 * @notice The Marketplace Access facet is in charge of keeping track of marketplace members.
 */
contract MarketplaceAccessFacet is AMarketplaceFacet, IHasMembers, IHasActiveMembers, IHasAutomatons {
  using LibAddressSet for LibAddressSet.Data;

  // Membership management.

  /**
   * @notice Queries whether a given address is a member of this Marketplace or not.
   * @param candidate is the address to test.
   * @return A `boolean` flag.
   */
  function isMember(address candidate)
      external override view returns(bool) {
    return LibMarketplaceAccess.data().memberSet.contains(candidate);
  }

  /**
   * @notice Counts the numbers of members present in this Marketplace.
   * @return The number of members in this marketplace.
   */
  function memberCount()
      external override view returns(uint256) {
    return LibMarketplaceAccess.data().memberSet.values.length;
  }

  /**
   * @notice Paginates the members of this Marketplace based on a starting cursor and a number of records per page.
   * @param cursor is the index at which to start.
   * @param perPage is how many records should be returned at most.
   * @return A `address[]` list of values at most `perPage` big.
   * @return A `uint256` index to the next page.
   */
  function paginateMembers(uint256 cursor, uint256 perPage)
      external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibMarketplaceAccess.data().memberSet.values, cursor, perPage);
  }

  /**
   * @notice Adds a member to this Marketplace member list.
   * @param member is the address of the member to be added.
   * @notice Requires that the caller is a member of the linked Issuer.
   * @notice Emits a `IHasMembers.MemberAdded` event.
   */
  function addMember(address payable member)
      external override
      onlyIssuerMember {
    // Add the member to our list.
    LibMarketplaceAccess.data().memberSet.add(member, false);
    // Emit!
    emit MemberAdded(member);
  }

  /**
   * @notice Removes a member from this Marketplace.
   * @param member is the address of the member to be removed.
   * @notice Requires that the caller is a member of the linked Issuer.
   * @notice Emits a `IHasMembers.MemberRemoved` event.
   */
  function removeMember(address member)
      external override
      onlyIssuerMember {
    LibMarketplaceAccess.Data storage s = LibMarketplaceAccess.data();
    // Ensure that member doesn't have any FAST membership.
    if (s.fastMemberships[member].values.length != 0) {
      revert ICustomErrors.RequiresNoFastMemberships(member);
    }
    // Remove member.
    s.memberSet.remove(member, false);
    // Emit!
    emit MemberRemoved(member);
  }

  /**
   * @notice Allows to query FAST memberships for a given member address.
   * @param member Is the address to check.
   * @param cursor The index at which to start.
   * @param perPage How many records should be returned at most.
   */
  function fastMemberships(address member, uint256 cursor, uint256 perPage)
      external view returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibMarketplaceAccess.data().fastMemberships[member].values, cursor, perPage);
  }

  /**
   * @notice Callback from FAST contracts allowing the Marketplace contract to keep track of FAST memberships.
   * @param member The member for which a new FAST membership has been added.
   */
  function memberAddedToFast(address member) 
      external {
    // Verify that the given address is in fact a registered FAST contract.
    if (!IssuerTopFacet(LibMarketplace.data().issuer).isFastRegistered(msg.sender)) {
      revert ICustomErrors.RequiresFastContractCaller();
    }
    // Keep track of the member's FAST membership.
    LibMarketplaceAccess.data().fastMemberships[member].add(msg.sender, false);
  }

  /**
   * @notice Callback from FAST contracts allowing the Marketplace contract to keep track of FAST memberships.
   * @param member The member for which a FAST membership has been removed.
   */
  function memberRemovedFromFast(address member)
      external {
    if (!IssuerTopFacet(LibMarketplace.data().issuer).isFastRegistered(msg.sender)) {
      revert ICustomErrors.RequiresFastContractCaller();
    }
    // Remove the tracked membership.
    LibMarketplaceAccess.data().fastMemberships[member].remove(msg.sender, false);
  }

  /**
   * @notice Given a member returns it's activation status.
   * @param candidate The address to check activation status on.
   */
  function isActiveMember(address candidate) external override view returns(bool) {
    return IHasMembers(this).isMember(candidate) &&
           !LibMarketplaceAccess.data().deactivatedMemberSet.contains(candidate);
  }

  /**
   * @notice Activates a member at the Marketplace level.
   * @param member The member to remove from the deactivation member set.
   */
  function activateMember(address member)
    external
    override
    onlyIssuerMember
    onlyMember(member) {
    // Guard against attempting to activate an already active member.
    if (this.isActiveMember(member)) {
      revert ICustomErrors.RequiresMarketplaceDeactivatedMember(member);
    }

    // Remove the member from the deactivated members list.
    LibMarketplaceAccess.data().deactivatedMemberSet.remove(member, false);

    // Emit!
    emit MemberActivated(member);
  }

  /**
   * @notice Deactivates a member at the Marketplace level.
   * @param member The member to add to the deactivation member set.
   */
  function deactivateMember(address payable member)
    external
    override
    onlyIssuerMember
    onlyMember(member) {
    // Guard against attempting to deactivate an already deactivated member.
    if (!this.isActiveMember(member)) {
      revert ICustomErrors.RequiresMarketplaceActiveMembership(member);
    }

    // Add the member to the deactivated members list.
    LibMarketplaceAccess.data().deactivatedMemberSet.add(member, false);

    // Emit!
    emit MemberDeactivated(member);
  }

  // Automatons management.

  /**
   * @notice Queries whether a given address is an automaton for this Marketplace or not.
   * @param candidate is the address to test.
   * @return A `boolean` flag.
   */
  function isAutomaton(address candidate)
      external override view returns(bool) {
    return LibMarketplaceAutomatons.data().automatonSet.contains(candidate);
  }

  /**
   * @notice Returns the privileges for a given automaton address, or zero if no privileges exist.
   * @param automaton is the address to test.
   * @return An `uint256` bitfield.
   */
  function automatonPrivileges(address automaton)
      external override view returns(uint256) {
    return LibMarketplaceAutomatons.data().automatonPrivileges[automaton];
  }

  /**
   * @notice Counts the numbers of automatons present in this Marketplace.
   * @return The number of automatons in this marketplace.
   */
  function automatonCount()
      external override view returns(uint256) {
    return LibMarketplaceAutomatons.data().automatonSet.values.length;
  }

  /**
   * @notice Paginates the automatons of this Marketplace based on a starting cursor and a number of records per page.
   * @param cursor is the index at which to start.
   * @param perPage is how many records should be returned at most.
   * @return A `address[]` list of values at most `perPage` big.
   * @return A `uint256` index to the next page.
   */
  function paginateAutomatons(uint256 cursor, uint256 perPage)
    external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(
      LibMarketplaceAutomatons.data().automatonSet.values,
      cursor,
      perPage
    );
  }

  /**
   * @notice Returns the privileges given to an automaton address in struct form.
   * @param automaton is the address to check.
   * @return A `LibMarketplaceAutomatons.Privileges` struct populated with privileges bits.
   */
  function automatonPrivilegesStruct(address automaton)
      external view returns(LibMarketplaceAutomatons.Privileges memory) {
    uint256 privileges = LibMarketplaceAutomatons.data().automatonPrivileges[automaton];
    return LibMarketplaceAutomatons.Privileges({
      canAddMember: (privileges & LibMarketplaceAutomatons.PRIVILEGE_ADD_MEMBER) != 0,
      canRemoveMember: (privileges & LibMarketplaceAutomatons.PRIVILEGE_REMOVE_MEMBER) != 0,
      canActivateMember: (privileges & LibMarketplaceAutomatons.PRIVILEGE_ACTIVATE_MEMBER) != 0,
      canDeactivateMember: (privileges & LibMarketplaceAutomatons.PRIVILEGE_DEACTIVATE_MEMBER) != 0
    });
  }

  /**
   * @notice Sets privileges for a given automaton address.
   * @param candidate is the automaton address to which the privileges should be assigned.
   * @param privileges is a bitfield of privileges to apply.
   */
  function setAutomatonPrivileges(address candidate, uint256 privileges)
      external onlyIssuerMember {
    LibMarketplaceAutomatons.Data storage ds = LibMarketplaceAutomatons.data();
    ds.automatonSet.add(candidate, true);
    ds.automatonPrivileges[candidate] = privileges;
    emit AutomatonPrivilegesSet(candidate, privileges);
  }

  /**
   * @notice Removes an automaton completely.
   * @param candidate is the automaton to remove.
   */
  function removeAutomaton(address candidate)
      external onlyIssuerMember {
    LibMarketplaceAutomatons.Data storage ds = LibMarketplaceAutomatons.data();
    ds.automatonSet.remove(candidate, false);
    delete ds.automatonPrivileges[candidate];
    emit AutomatonRemoved(candidate);
  }
}
