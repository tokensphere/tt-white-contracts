// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./lib/AMarketplaceFacet.sol";
import "../common/AHasAutomatons.sol";

// Privileges bits.
uint32 constant MARKETPLACE_PRIVILEGE_MANAGE_MEMBERS = 1;

/**
 * @title The Marketplace Smart Contract.
 * @notice The Marketplace Automatons facet is in charge of keeping track of automaton accounts.
 */
contract MarketplaceAutomatonsFacet is AMarketplaceFacet, AHasAutomatons {
  /// Automatons management.

  function isAutomatonsManager(address who) internal view override(AHasAutomatons) returns (bool) {
    return _isIssuerMember(who);
  }
}
