// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../interfaces/IERC165.sol"; // Interface Support.
import "../interfaces/IERC173.sol"; // Ownership.
import "../interfaces/IDiamondCut.sol"; // Facet management.
import "../interfaces/IDiamondLoupe.sol"; // Facet introspection.
import "../interfaces/ICustomErrors.sol";
import "../lib/LibDiamond.sol";
import "./lib/APaymasterFacet.sol";
import "./lib/LibPaymaster.sol";

import "@opengsn/contracts/src/interfaces/IPaymaster.sol";

/// @notice The Paymaster initialization facet.
contract PaymasterInitFacet is APaymasterFacet {
  /// Initializers.

  struct InitializerParams {
    address marketplace;
  }

  function initialize(InitializerParams calldata params) external onlyDeployer {
    // Make sure we haven't initialized yet.
    if (LibPaymaster.data().version >= LibPaymaster.STORAGE_VERSION) revert ICustomErrors.AlreadyInitialized();

    // Register interfaces.
    LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    ds.supportedInterfaces[type(IPaymaster).interfaceId] = true;
    ds.supportedInterfaces[type(IERC165).interfaceId] = true;
    ds.supportedInterfaces[type(IERC173).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;

    // ------------------------------------- //

    // Initialize top-level storage.
    LibPaymaster.Data storage topData = LibPaymaster.data();
    topData.version = LibPaymaster.STORAGE_VERSION;
    topData.marketplace = params.marketplace;
  }
}
