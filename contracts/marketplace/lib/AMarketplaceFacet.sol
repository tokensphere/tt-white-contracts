// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../lib/LibHelpers.sol";
import "../../common/AHasMembers.sol";
import "../../interfaces/ICustomErrors.sol";
import "../lib/LibMarketplace.sol";
import "./IMarketplaceEvents.sol";

/**
 * @notice This contract is a group of modifiers that can be used by any Marketplace facets to guard against
 *       certain permissions.
 */
abstract contract AMarketplaceFacet is IMarketplaceEvents {
  /// Internal ACL functions.

  function _isIssuerMember(address who) internal view returns (bool) {
    return AHasMembers(LibMarketplace.data().issuer).isMember(who);
  }

  // Modifiers.

  /// @notice Ensures that a method can only be called by the singleton deployer contract factory.
  modifier onlyDeployer() virtual {
    if (!LibHelpers._isDeployer(msg.sender)) revert ICustomErrors.InternalMethod();
    _;
  }

  /**
   * @notice Requires that the message sender is a member of the linked Issuer.
   */
  modifier onlyIssuerMember() virtual {
    if (!_isIssuerMember(msg.sender)) revert ICustomErrors.RequiresIssuerMembership(msg.sender);
    _;
  }

  /**
   * @notice Requires that the given address is a member of the marketplace.
   * @param who is the address to be checked.
   */
  modifier onlyMember(address who) virtual {
    if (!AHasMembers(address(this)).isMember(who)) revert ICustomErrors.RequiresMarketplaceMembership(who);
    _;
  }
}
