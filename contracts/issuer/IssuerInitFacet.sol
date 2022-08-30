// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../interfaces/IERC165.sol';       // Interface Support.
import '../interfaces/IERC173.sol';       // Ownership.
import '../interfaces/IDiamondCut.sol';   // Facet management.
import '../interfaces/IDiamondLoupe.sol'; // Facet introspection.
import '../interfaces/IHasMembers.sol';   // Membership management.
import '../lib/LibConstants.sol';
import '../lib/LibDiamond.sol';
import '../lib/LibAddressSet.sol';
import './lib/AIssuerFacet.sol';
import './lib/LibIssuer.sol';
import './lib/LibIssuerAccess.sol';


/** @title The Issuer Smart Contract.
 *  @dev The marketplace contract is in charge of keeping track of marketplace members and has logic
 *  related to trading.
 *  It requires an Issuer contract instance at construct-time, as it relies on Issuer membership
 *  to permission governance functions.
 */
contract IssuerInitFacet is AIssuerFacet {
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
    require(LibIssuer.data().version < LibIssuer.STORAGE_VERSION, LibConstants.ALREADY_INITIALIZED);

    // Register interfaces.
    LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    ds.supportedInterfaces[type(IERC165).interfaceId] = true;
    ds.supportedInterfaces[type(IERC173).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
    ds.supportedInterfaces[type(IHasMembers).interfaceId] = true;

    // ------------------------------------- //

    // Initialize top-level storage.
    LibIssuer.Data storage topData = LibIssuer.data();
    topData.version = LibIssuer.STORAGE_VERSION;

    // ------------------------------------- //

    // Initialize access storage.
    LibIssuerAccess.Data storage s = LibIssuerAccess.data();
    s.version = LibIssuerAccess.STORAGE_VERSION;
    // Add the member and emit.
    s.memberSet.add(params.member, false);
    emit MemberAdded(params.member);
  }
}
