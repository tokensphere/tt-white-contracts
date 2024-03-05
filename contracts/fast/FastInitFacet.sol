// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../common/lib/LibHasGovernors.sol";
import "../common/lib/LibHasMembers.sol";
import "../common/lib/LibHasAutomatons.sol";
import "../common/lib/LibHasForwarder.sol";
import "../common/AHasGovernors.sol";
import "../common/AHasMembers.sol";
import "../common/AHasAutomatons.sol";
import "../interfaces/IERC165.sol"; // Interface Support.
import "../interfaces/IERC173.sol"; // Ownership.
import "../interfaces/IDiamondCut.sol"; // Facet management.
import "../interfaces/IDiamondLoupe.sol"; // Facet introspection.
import "../interfaces/IERC20.sol"; // Token.
import "../interfaces/ICustomErrors.sol";
import "../lib/LibDiamond.sol";
import "../lib/LibAddressSet.sol";
import "./lib/AFastFacet.sol";
import "./lib/LibFast.sol";
import "./lib/LibFastToken.sol";
import "./lib/LibFastHistory.sol";
import "./lib/LibFastDistributions.sol";
import "./lib/LibFastCrowdfunds.sol";

/**
 * @notice NotAlthough this contract doesn't explicitelly inherit from IERC173, ERC165, IDiamondLoupe etc, all
 * methods are in fact implemented by the underlaying Diamond proxy. It is therefore safe to
 * perform casts directly on the current contract address into these interfaces.
 */
contract FastInitFacet is AFastFacet {
  using LibAddressSet for LibAddressSet.Data;
  /// Events.

  // Duplicated from AHasMembers and AHasGovernors.
  event MemberAdded(address indexed member);
  event GovernorAdded(address indexed governor);

  /// Initializers.

  struct InitializerParams {
    // Top-level stuff.
    address issuer;
    address marketplace;
    // Token stuff.
    string name;
    string symbol;
    uint8 decimals;
    bool hasFixedSupply;
    bool isSemiPublic;
    uint32 crowdfundsDefaultBasisPointsFee;
  }

  function initialize(InitializerParams calldata params) external onlyDeployer {
    // Make sure we haven't initialized yet.
    if (LibFast.data().version >= LibFast.STORAGE_VERSION) revert ICustomErrors.AlreadyInitialized();

    // Register interfaces.
    LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    ds.supportedInterfaces[type(IERC20).interfaceId] = true;
    ds.supportedInterfaces[type(IERC165).interfaceId] = true;
    ds.supportedInterfaces[type(IERC173).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;

    // ------------------------------------- //

    // Initialize top-level facet storage.
    LibFast.Data storage topData = LibFast.data();
    topData.version = LibFast.STORAGE_VERSION;
    topData.issuer = params.issuer;
    topData.marketplace = params.marketplace;
    topData.hasFixedSupply = params.hasFixedSupply;
    topData.isSemiPublic = params.isSemiPublic;
    // For expliciteness / data slot cleanup.
    topData.transfersDisabled = false;

    // ------------------------------------- //

    // Initialize token facet storage.
    LibFastToken.Data storage tokenData = LibFastToken.data();
    tokenData.version = LibFastToken.STORAGE_VERSION;
    // Set up ERC20 related stuff.
    tokenData.name = params.name;
    tokenData.symbol = params.symbol;
    tokenData.decimals = params.decimals;
    // For expliciteness / data slot cleanup.
    tokenData.totalSupply = 0;

    // Initialize history facet storage.
    LibFastHistory.data().version = LibFastHistory.STORAGE_VERSION;

    // Initialize distributions facet storage.
    LibFastDistributions.data().version = LibFastDistributions.STORAGE_VERSION;

    // Initialize crowfunds facet storage.
    LibFastCrowdfunds.Data storage cfData = LibFastCrowdfunds.data();
    cfData.version = LibFastCrowdfunds.STORAGE_VERSION;
    if (params.crowdfundsDefaultBasisPointsFee > 100_00)
      revert ICustomErrors.InvalidCrowdfundBasisPointsFee(params.crowdfundsDefaultBasisPointsFee);
    cfData.crowdfundsDefaultBasisPointsFee = params.crowdfundsDefaultBasisPointsFee;

    // ------------------------------------- //

    // Initialize members and governors storage.
    LibHasGovernors.Data storage governorsData = LibHasGovernors.data();
    governorsData.version = LibHasGovernors.STORAGE_VERSION;

    LibHasMembers.Data storage membersData = LibHasMembers.data();
    membersData.version = LibHasMembers.STORAGE_VERSION;

    // Initialize members storage.
    LibHasMembers.data().version = LibHasMembers.STORAGE_VERSION;

    // Initialize automatons storage.
    LibHasAutomatons.data().version = LibHasAutomatons.STORAGE_VERSION;

    // ------------------------------------- //

    // Initialize forwarder storage.
    LibHasForwarder.Data storage forwarderData = LibHasForwarder.data();
    forwarderData.version = LibHasForwarder.STORAGE_VERSION;
    forwarderData.forwarderAddress = address(0);
  }
}
