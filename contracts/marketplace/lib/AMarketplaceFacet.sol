// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../lib/LibConstants.sol';
import '../../lib/LibAddressSet.sol';
import '../lib/LibMarketplace.sol';
import '../lib/LibMarketplaceAccess.sol';
import '../lib/LibMarketplaceTokenHolders.sol';
import '../../interfaces/IERC173.sol';
import '../../interfaces/ICustomErrors.sol';
import '../../interfaces/IHasMembers.sol';
import './IMarketplaceEvents.sol';


/**
* @notice This contract is a group of modifiers that can be used by any Marketplace facets to guard against
*       certain permissions.
*/
abstract contract AMarketplaceFacet is IMarketplaceEvents {
  using LibAddressSet for LibAddressSet.Data;

  // Modifiers.

  /// @notice Ensures that a method can only be called by the singleton deployer contract factory.
  modifier onlyDeployer() {
    if (msg.sender != LibConstants.DEPLOYER_CONTRACT) {
      revert ICustomErrors.InternalMethod();
    }
    _;
  }

  /**
   * @notice Requires that the message sender is a member of the linked Issuer.
   */
  modifier onlyIssuerMember() {
    if (!IHasMembers(LibMarketplace.data().issuer).isMember(msg.sender)) {
      revert ICustomErrors.RequiresIssuerMembership();
    }
    _;
  }

  /**
   * @notice Requires that the given address is a member of the marketplace.
   * @param candidate is the address to be checked.
   */
  modifier onlyMember(address candidate) {
    if (!LibMarketplaceAccess.data().memberSet.contains(candidate)) {
      revert ICustomErrors.RequiresMarketplaceMembership();
    }
    _;
  }
}
