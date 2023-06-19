// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../lib/LibHelpers.sol";
import "../../common/AHasMembers.sol";
import "../../interfaces/ICustomErrors.sol";
import "./IIssuerEvents.sol";

/**
 * @notice This abstract contract encapsulates modifiers allowing inheriting facets to guard against
 * certain permissions.
 */
abstract contract AIssuerFacet is IIssuerEvents {
  /// Modifiers.

  /// @notice Ensures that a method can only be called by another facet of the same diamond.
  modifier onlyDiamondFacet() {
    if (!LibHelpers._isDiamondFacet(msg.sender)) revert ICustomErrors.InternalMethod();
    _;
  }

  /// @notice Ensures that a method can only be called by the owner of this diamond.
  modifier onlyDiamondOwner() {
    if (!LibHelpers._isDiamondOwner(msg.sender)) revert ICustomErrors.RequiresDiamondOwnership(msg.sender);
    _;
  }

  /// @notice Ensures that a method can only be called by the singleton deployer contract factory.
  modifier onlyDeployer() {
    if (!LibHelpers._isDeployer(msg.sender)) revert ICustomErrors.InternalMethod();
    _;
  }

  /**
   * @notice Ensures that the given address is a member of the FAST.
   * @param who The address to check.
   */
  modifier onlyMember(address who) {
    if (!AHasMembers(address(this)).isMember(who)) revert ICustomErrors.RequiresIssuerMembership(who);
    _;
  }
}
