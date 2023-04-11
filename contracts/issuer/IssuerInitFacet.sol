// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../common/AHasMembers.sol';
import '../common/AHasAutomatons.sol';
import '../interfaces/IERC165.sol';       // Interface Support.
import '../interfaces/IERC173.sol';       // Ownership.
import '../interfaces/IDiamondCut.sol';   // Facet management.
import '../interfaces/IDiamondLoupe.sol'; // Facet introspection.
import '../interfaces/ICustomErrors.sol';
import '../lib/LibDiamond.sol';
import '../lib/LibAddressSet.sol';
import './lib/AIssuerFacet.sol';
import './lib/LibIssuer.sol';
import './lib/LibIssuerAccess.sol';


/**
 * @title The Issuer Smart Contract.
 * @notice The marketplace contract is in charge of keeping track of marketplace members and has logic
 * related to trading.
 * It requires an Issuer contract instance at construct-time, as it relies on Issuer membership
 * to permission governance functions.
 */
contract IssuerInitFacet is AIssuerFacet {
  using LibAddressSet for LibAddressSet.Data;
  /// Events.

  // Duplicated from AHasMembers.
  event MemberAdded(address indexed member);

  /// Initializers.

  struct InitializerParams {
    address payable member;
  }

  function initialize(InitializerParams calldata params)
      external onlyDiamondOwner() {
    // Make sure we haven't initialized yet.
    if (LibIssuer.data().version >= LibIssuer.STORAGE_VERSION)
      revert ICustomErrors.AlreadyInitialized();

    // Register interfaces.
    LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    ds.supportedInterfaces[type(IERC165).interfaceId] = true;
    ds.supportedInterfaces[type(IERC173).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;

    // ------------------------------------- //

    // Initialize top-level facet storage.
    LibIssuer.data().version = LibIssuer.STORAGE_VERSION;

    // Initialize access facet storage.
    LibIssuerAccess.data().version = LibIssuerAccess.STORAGE_VERSION;

    // ------------------------------------- //

    // Initialize members storage.
    LibHasMembers.Data storage membersData = LibHasMembers.data();
    membersData.version = LibHasMembers.STORAGE_VERSION;
    // Add the member and emit.
    membersData.memberSet.add(params.member, false);
    // Emit!
    emit MemberAdded(params.member);

    // Initialize automatons storage.
    LibHasAutomatons.data().version = LibHasAutomatons.STORAGE_VERSION;
  }
}
