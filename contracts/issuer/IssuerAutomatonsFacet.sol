// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import './lib/AIssuerFacet.sol';
import '../common/AHasAutomatons.sol';

// Privileges bits.
// TODO: Propagate trait to various methods.
uint32 constant ISSUER_PRIVILEGE_GOVERNANCE = 1;
uint32 constant ISSUER_PRIVILEGE_CROWDFUND_CREATOR = 2;

/**
 * @title The Issuer Smart Contract.
 * @notice The Issuer Automatons facet is in charge of keeping track of automaton accounts.
 */
contract IssuerAutomatonsFacet is AIssuerFacet, AHasAutomatons {
  /// Constants etc.

  /// Automatons management.

  function isAutomatonsManager(address who)
      internal view override(AHasAutomatons)
      returns(bool) {
    return AHasMembers(address(this)).isMember(who);
  }
}
