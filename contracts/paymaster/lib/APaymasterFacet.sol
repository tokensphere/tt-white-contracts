// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../common/AHasMembers.sol";
import "../../interfaces/ICustomErrors.sol";
import "../../lib/LibHelpers.sol";
import "../lib/LibPaymaster.sol";

/**
 * @notice This contract is a group of modifiers that can be used by any Paymaster facets to guard against
 *       certain permissions.
 */
abstract contract APaymasterFacet {
  /// Internal ACL functions.

  /// ...

  // Modifiers.

  /// @notice Ensures that a method can only be called by the singleton deployer contract factory.
  modifier onlyDeployer() virtual {
    if (!LibHelpers._isDeployer(msg.sender)) revert ICustomErrors.InternalMethod();
    _;
  }
}
