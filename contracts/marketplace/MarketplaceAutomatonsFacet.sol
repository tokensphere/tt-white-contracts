// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import './lib/AMarketplaceFacet.sol';
import '../common/AHasAutomatons.sol';


/**
 * @title The Marketplace Smart Contract.
 * @notice The Marketplace Automatons facet is in charge of keeping track of automaton accounts.
 */
contract MarketplaceAutomatonsFacet is AMarketplaceFacet, AHasAutomatons {
  /// Constants etc.

  // Privileges bits.
  uint256 constant PRIVILEGE_ADD_MEMBER = 1;
  uint256 constant PRIVILEGE_REMOVE_MEMBER = 2;
  uint256 constant PRIVILEGE_ACTIVATE_MEMBER = 4;
  uint256 constant PRIVILEGE_DEACTIVATE_MEMBER = 8;

  // Privileges struct.
  struct Privileges {
    bool canAddMember;
    bool canRemoveMember;
    bool canActivateMember;
    bool canDeactivateMember;
  }

  /// Automatons management.

  /**
   * @notice Returns the privileges given to an automaton address in struct form.
   * @param automaton is the address to check.
   * @return A `LibAutomatons.Privileges` struct populated with privileges bits.
   */
  function automatonPrivilegesStruct(address automaton)
      external view returns(Privileges memory) {
    uint256 privileges = LibAutomatons.data().automatonPrivileges[automaton];
    return Privileges({
      canAddMember: (privileges & PRIVILEGE_ADD_MEMBER) != 0,
      canRemoveMember: (privileges & PRIVILEGE_REMOVE_MEMBER) != 0,
      canActivateMember: (privileges & PRIVILEGE_ACTIVATE_MEMBER) != 0,
      canDeactivateMember: (privileges & PRIVILEGE_DEACTIVATE_MEMBER) != 0
    });
  }

  /**
   * @notice Ensures that the message sender is a member of the Issuer.
   */
  modifier onlyIssuerMember() override(AMarketplaceFacet, AHasAutomatons) {
    if (!IHasMembers(LibMarketplace.data().issuer).isMember(msg.sender))
      revert ICustomErrors.RequiresIssuerMembership(msg.sender);
    _;
  }
}
