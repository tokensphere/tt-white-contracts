// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import './lib/AFastFacet.sol';
import '../common/AHasAutomatons.sol';


// Privileges bits.
uint32 constant FAST_PRIVILEGE_MANAGE_MEMBERS = 1;
uint32 constant FAST_PRIVILEGE_MANAGE_DISTRIBUTIONS = 2;

/**
 * @title The Fast Smart Contract.
 * @notice The Fast Automatons facet is in charge of keeping track of automaton accounts.
 */
contract FastAutomatonsFacet is AFastFacet, AHasAutomatons {
  /// Automatons management.

  function isAutomatonsManager(address who)
      internal view override(AHasAutomatons)
      returns(bool) {
    return _isIssuerMember(who);
  }
}
