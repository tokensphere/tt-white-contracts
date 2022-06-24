// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../interfaces/IERC165.sol';       // Interface Support.
import '../interfaces/IERC173.sol';       // Ownership.
import '../interfaces/IDiamondCut.sol';   // Facet management.
import '../interfaces/IDiamondLoupe.sol'; // Facet introspection.
import '../interfaces/IHasMembers.sol';   // Membership management.
import '../lib/LibDiamond.sol';
import './lib/AExchangeFacet.sol';


/** @dev The Exchange initialization facet.
 */
contract ExchangeInitFacet is AExchangeFacet {
  struct InitializerParams {
    address spc;
  }

  function initialize(InitializerParams calldata params)
      external
      deployerContract() {
    // Grab our storage.
    LibExchange.Data storage s = LibExchange.data();
    // Make sure we havn't initialized yet.
    require(s.version < LibExchange.STORAGE_VERSION, 'Already initialized');
    s.version = LibExchange.STORAGE_VERSION;

    // Register interfaces.
    LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    ds.supportedInterfaces[type(IERC165).interfaceId] = true;
    ds.supportedInterfaces[type(IERC173).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
    ds.supportedInterfaces[type(IHasMembers).interfaceId] = true;

    // ------------------------------------- //

    // Initialize top-level storage.
    s.spc = params.spc;
  }
}
