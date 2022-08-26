// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../interfaces/IStorageMigrateable.sol';
import '../lib/LibDiamond.sol';
import './lib/LibMarketplaceTokenHolders.sol';
import '../interfaces/ITokenHoldings.sol';

// Current migration.
import './migrations/Migration_20220826.sol';

/// @dev The Marketplace Migrations facet.
contract MarketplaceMigrationsFacet is IStorageMigrateable {

  /// @notice See: `IStorageMigrateable.migrate`.
  function migrate()
      external override
      // Add modifiers to protect this being called.
      returns(bool) {
    // Hand off to library function.
    return Migration_20220826.migrate();
  }
}