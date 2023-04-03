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
  uint32 constant PRIVILEGE_MANAGE_MEMBERS = 1;
  uint32 constant PRIVILEGE_ACTIVATE_MEMBERS = 2;

  /// Automatons management.

  function isAutomatonsManager(address who)
      internal view override(AHasAutomatons)
      returns(bool) {
    return _isIssuerMember(who);
  }
}
