// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import '../../lib/LibConstants.sol';
import '../../lib/LibAddressSet.sol';
import '../lib/LibMarketplace.sol';
import '../lib/LibMarketplaceAccess.sol';
import '../lib/LibMarketplaceTokenHolders.sol';
import '../../interfaces/IERC173.sol';
import '../../interfaces/IHasMembers.sol';
import './IMarketplaceEvents.sol';


/**
* @dev This contract is a group of modifiers that can be used by any Marketplace facets to guard against
*       certain permissions.
*/
abstract contract AMarketplaceFacet is IMarketplaceEvents {
  using LibAddressSet for LibAddressSet.Data;

  // Modifiers.

  /// @dev Ensures that a method can only be called by the singleton deployer contract factory.
  modifier onlyDeployer() {
    require(
      msg.sender == LibConstants.DEPLOYER_CONTRACT,
      LibConstants.INTERNAL_METHOD
    );
    _;
  }

  /** @dev Requires that the message sender is a member of the linked Issuer.
   */
  modifier onlyIssuerMember() {
    require(
      IHasMembers(LibMarketplace.data().issuer).isMember(msg.sender),
      LibConstants.REQUIRES_ISSUER_MEMBERSHIP
    );
    _;
  }

  /** @dev Requires that the given address is a member of the marketplace.
   *  @param candidate is the address to be checked.
   */
  modifier onlyMember(address candidate) {
    require(
      LibMarketplaceAccess.data().memberSet.contains(candidate),
      LibConstants.REQUIRES_MARKETPLACE_MEMBERSHIP
    );
    _;
  }
}
