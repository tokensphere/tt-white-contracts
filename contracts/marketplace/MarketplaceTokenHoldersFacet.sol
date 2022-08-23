// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './lib/AMarketplaceFacet.sol';
import '../issuer/IssuerTopFacet.sol';
import '../interfaces/IERC20.sol';
import '../interfaces/ITokenHoldings.sol';

/** @dev The Marketplace FAST balances facet.
 */
contract MarketplaceTokenHoldersFacet is AMarketplaceFacet, ITokenHoldings {
  using LibAddressSet for LibAddressSet.Data;

  /** @dev The callback used when a balance changes on a FAST.
   */
  function holdingUpdated(address account, address fast)
    external override {
    // Return early if this is the zero address.
    if (account == address(0)) return;

    // Verify that the given address is in fact a registered FAST contract.
    require(
      IssuerTopFacet(LibMarketplace.data().issuer).isFastRegistered(msg.sender),
      LibConstants.REQUIRES_FAST_CONTRACT_CALLER
    );

    // Get the storage pointer and balance of the token holder.
    LibMarketplaceTokenHolders.Data storage s = LibMarketplaceTokenHolders.data();
    uint256 balance = IERC20(fast).balanceOf(account);

    // If this is a positive balance and it doesn't already exist in the set, add address.
    if (balance > 0 && !s.fastHoldings[account].contains(fast)) {
      s.fastHoldings[account].add(fast, false);
    }

    // If the balance is 0 and it exists in the set, remove it.
    if (balance == 0 && s.fastHoldings[account].contains(fast)) {
      s.fastHoldings[account].remove(fast, false);
    }
  }

  /** @dev A way to get a list of FASTs for an account.
   *  @return list of FAST addresses.
   */
  function holdings(address account)
    external view override
    returns(address[] memory) {
    LibMarketplaceTokenHolders.Data storage s = LibMarketplaceTokenHolders.data();
    return s.fastHoldings[account].values;
  }

  // Migration functions for this Facet.

  /// @notice Called by deployer to migrate underlying storage to latest version.
  // TODO: Add better guarding when calling this.
  function migrate()
      external
      // onlyDeployer
      returns(bool) {
    return migrateV1();
  }

  // Internal versioned migration functions.

  // Perform v1 migrations.
  function migrateV1()
      internal
      onlyMigrateOnce
      returns(bool) {
    // Update interfaces.
    LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    ds.supportedInterfaces[type(ITokenHoldings).interfaceId] = true;

    // Initialize the new storage version.
    LibMarketplaceTokenHolders.Data storage tokenHoldersData = LibMarketplaceTokenHolders.data();
    tokenHoldersData.version = LibMarketplaceTokenHolders.STORAGE_VERSION;

    // ??
    return true;
  }

  // Generic guard against re-migrating the same version.
  modifier onlyMigrateOnce() {
    require(
      LibMarketplaceTokenHolders.data().version < LibMarketplaceTokenHolders.STORAGE_VERSION,
      LibConstants.ALREADY_MIGRATED
    );
    _;
  }
}