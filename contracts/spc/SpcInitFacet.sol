// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../interfaces/IERC165.sol';       // Interface Support.
import '../interfaces/IERC173.sol';       // Ownership.
import '../interfaces/IDiamondCut.sol';   // Facet management.
import '../interfaces/IDiamondLoupe.sol'; // Facet introspection.
import '../interfaces/IHasMembers.sol';   // Membership management.

import '../lib/LibConstants.sol';
import '../lib/LibDiamond.sol';
import '../lib/LibAddressSet.sol';

import './lib/ASpcFacet.sol';
import './lib/LibSpcEvents.sol';
import './lib/LibSpc.sol';
import './lib/LibSpcAccess.sol';


/** @title The Spc Smart Contract.
 *  @dev The exchange contract is in charge of keeping track of exchange members and has logic
 *  related to trading.
 *  It requires an SPC contract instance at construct-time, as it relies on SPC membership
 *  to permission governance functions.
 */
contract SpcInitFacet is ASpcFacet {
  using LibAddressSet for LibAddressSet.Data;

  /// Initializers.

  struct InitializerParams {
    address payable member;
  }

  function initialize(InitializerParams calldata params)
      external
      onlyDiamondOwner {
    // Grab our top-level storage.
    // Make sure we haven't initialized yet.
    require(LibSpc.data().version < LibSpc.STORAGE_VERSION, LibConstants.ALREADY_INITIALIZED);

    // Register interfaces.
    LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    ds.supportedInterfaces[type(IERC165).interfaceId] = true;
    ds.supportedInterfaces[type(IERC173).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
    ds.supportedInterfaces[type(IHasMembers).interfaceId] = true;

    // ------------------------------------- //

    // Initialize top-level storage.
    LibSpc.Data storage topData = LibSpc.data();
    topData.version = LibSpc.STORAGE_VERSION;

    // ------------------------------------- //

    // Initialize access storage.
    LibSpcAccess.Data storage s = LibSpcAccess.data();
    s.version = LibSpcAccess.STORAGE_VERSION;
    // Add the member and emit.
    s.memberSet.add(params.member, false);
    emit LibSpcEvents.MemberAdded(params.member);
  }
}
