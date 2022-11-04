// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../interfaces/IHasAutomatons.sol';
import '../interfaces/IHasActiveMembers.sol';
import './lib/LibMarketplaceAutomatons.sol';
import './lib/LibMarketplaceAccess.sol';
import './lib/AMarketplaceFacet.sol';


/**
 * @title The Marketplace Smart Contract.
 * @notice The Marketplace Access facet is in charge of keeping track of marketplace members.
 */
contract MarketplaceAutomatonsFacet is AMarketplaceFacet, IHasAutomatons {
  using LibAddressSet for LibAddressSet.Data;

  function isAutomaton(address candidate)
      external override view returns(bool) {
    return LibMarketplaceAutomatons.data().automatonSet.contains(candidate);
  }

  function automatonPrivileges(address automaton)
      external override view returns(uint256) {
    return LibMarketplaceAutomatons.data().automatonPrivileges[automaton];
  }

  function automatonCount()
      external override view returns(uint256) {
    return LibMarketplaceAutomatons.data().automatonSet.values.length;
  }

  function paginateAutomatons(uint256 index, uint256 perPage)
    external override view returns(address[] memory, uint256) {
    return LibPaginate.addresses(
      LibMarketplaceAutomatons.data().automatonSet.values,
      index,
      perPage
    );
  }

  function automatonPrivilegesStruct(address automaton)
      external view returns(LibMarketplaceAutomatons.Privileges memory) {
    LibMarketplaceAutomatons.Data storage ds = LibMarketplaceAutomatons.data();
    uint256 privileges = ds.automatonPrivileges[automaton];
    return LibMarketplaceAutomatons.Privileges({
      canAddMember: (privileges & LibMarketplaceAutomatons.PRIVILEGE_ADD_MEMBER) != 0,
      canRemoveMember: (privileges & LibMarketplaceAutomatons.PRIVILEGE_REMOVE_MEMBER) != 0,
      canActivateMember: (privileges & LibMarketplaceAutomatons.PRIVILEGE_ACTIVATE_MEMBER) != 0,
      canDeactivateMember: (privileges & LibMarketplaceAutomatons.PRIVILEGE_DEACTIVATE_MEMBER) != 0
    });
  }

  function setAutomatonPrivileges(address candidate, uint256 privileges)
      external onlyIssuerMember {
    LibMarketplaceAutomatons.Data storage ds = LibMarketplaceAutomatons.data();
    ds.automatonSet.add(candidate, true);
    ds.automatonPrivileges[candidate] = privileges;
  }

  function removeAutomaton(address candidate)
      external onlyIssuerMember {
    LibMarketplaceAutomatons.Data storage ds = LibMarketplaceAutomatons.data();
    ds.automatonSet.remove(candidate, false);
    delete ds.automatonPrivileges[candidate];
  }
}
