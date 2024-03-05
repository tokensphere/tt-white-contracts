// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../common/AHasForwarder.sol";
import "./lib/AFastFacet.sol";

/**
 * @title The Fast forwardable contract.
 * @notice The Fast Forwardable facet is in charge of "gasless transactions".
 */
contract FastForwardableFacet is AFastFacet, AHasForwarder {
  /// AHasForwarder implementation.

  // For now the forwarder manager is an issuer.
  function isValidForwarderManager(address who) internal view override(AHasForwarder) returns (bool) {
    return _isIssuerMember(who);
  }
}
