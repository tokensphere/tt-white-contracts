// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../common/AHasForwarder.sol";
import "./lib/AMarketplaceFacet.sol";

/**
 * @title The Marketplace Smart Contract.
 * @notice The Marketplace Forwardable facet is in charge of "gasless transactions".
 */
contract MarketplaceForwardableFacet is AMarketplaceFacet, AHasForwarder {
  /// AHasForwarder implementation.

  // For now the forwarder manager is an issuer.
  function isValidForwarderManager(address who) internal view override(AHasForwarder) returns (bool) {
    return _isIssuerMember(who);
  }
}
