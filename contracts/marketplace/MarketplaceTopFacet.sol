// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../issuer/IssuerTopFacet.sol';
import './lib/LibMarketplace.sol';
import '../interfaces/IHasMembers.sol';
import './lib/AMarketplaceFacet.sol';


/**
 * @title The Marketplace Smart Contract.
 * @notice The Marketplace Top facet is in charge of keeping track of common parameters and provides
 * generic functionality.
 */
contract MarketplaceTopFacet is AMarketplaceFacet {
  // Getters.

  function issuerAddress()
    external view returns(address) {
      return LibMarketplace.data().issuer;
  }
}
