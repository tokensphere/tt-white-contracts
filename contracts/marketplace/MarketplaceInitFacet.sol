// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../common/lib/LibHasMembers.sol";
import "../common/lib/LibHasAutomatons.sol";
import "../common/lib/LibHasForwarder.sol";
import "../common/AHasMembers.sol";
import "../common/AHasAutomatons.sol";
import "../interfaces/IERC165.sol"; // Interface Support.
import "../interfaces/IERC173.sol"; // Ownership.
import "../interfaces/IDiamondCut.sol"; // Facet management.
import "../interfaces/IDiamondLoupe.sol"; // Facet introspection.
import "../interfaces/ICustomErrors.sol";
import "../lib/LibDiamond.sol";
import "./lib/AMarketplaceFacet.sol";
import "./lib/LibMarketplace.sol";
import "./lib/LibMarketplaceAccess.sol";
import "./lib/LibMarketplaceTokenHolders.sol";

/// @notice The Marketplace initialization facet.
contract MarketplaceInitFacet is AMarketplaceFacet {
  /// Initializers.

  struct InitializerParams {
    address issuer;
  }

  function initialize(InitializerParams calldata params) external onlyDeployer {
    // Make sure we haven't initialized yet.
    if (LibMarketplace.data().version >= LibMarketplace.STORAGE_VERSION) revert ICustomErrors.AlreadyInitialized();

    // Register interfaces.
    LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    ds.supportedInterfaces[type(IERC165).interfaceId] = true;
    ds.supportedInterfaces[type(IERC173).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;

    // ------------------------------------- //

    // Initialize top-level storage.
    LibMarketplace.Data storage topData = LibMarketplace.data();
    topData.version = LibMarketplace.STORAGE_VERSION;
    topData.issuer = params.issuer;

    // ------------------------------------- //

    // Initialize access storage.
    LibMarketplaceAccess.data().version = LibMarketplaceAccess.STORAGE_VERSION;

    // ------------------------------------- //

    // Initialize token holders storage.
    LibMarketplaceTokenHolders.data().version = LibMarketplaceTokenHolders.STORAGE_VERSION;

    // ------------------------------------- //

    // Initialize members storage.
    LibHasMembers.data().version = LibHasMembers.STORAGE_VERSION;

    // ------------------------------------- //

    // Initialize automatons storage.
    LibHasAutomatons.data().version = LibHasAutomatons.STORAGE_VERSION;

    // ------------------------------------- //

    // Initialize forwarder storage.
    LibHasForwarder.Data storage forwarderData = LibHasForwarder.data();
    forwarderData.version = LibHasForwarder.STORAGE_VERSION;
    forwarderData.forwarderAddress = address(0);
  }
}
