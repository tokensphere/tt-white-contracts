// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibConstants.sol';
import '../../interfaces/ITokenHoldings.sol';
import '../../lib/LibDiamond.sol';
import '../lib/LibMarketplaceTokenHolders.sol';

// This is the top level description of the migration.
/// @notice Adds token holders etc.
library Migration_20220826 {

  function migrate()
      internal returns(bool) {
    require(
      LibMarketplaceTokenHolders.data().version < LibMarketplaceTokenHolders.STORAGE_VERSION,
      LibConstants.ALREADY_MIGRATED
    );

    LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    ds.supportedInterfaces[type(ITokenHoldings).interfaceId] = true;

    // Initialize token holders storage.
    LibMarketplaceTokenHolders.Data storage tokenHoldersData = LibMarketplaceTokenHolders.data();
    tokenHoldersData.version = LibMarketplaceTokenHolders.STORAGE_VERSION;

    return true;
  }
}