// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../common/AHasMembers.sol';
import '../common/AHasGovernors.sol';
import '../marketplace/MarketplaceAccessFacet.sol';
import '../issuer/IssuerAccessFacet.sol';
import './FastTokenFacet.sol';
import './lib/AFastFacet.sol';
import './lib/LibFast.sol';
import './FastTopFacet.sol';
import './FastFrontendFacet.sol';
import './FastAutomatonsFacet.sol';


/**
 * @title The Fast Smart Contract.
 * @notice The FAST Access facet is the source of truth when it comes to
 * permissioning and ACLs within a given FAST.
 */
contract FastAccessFacet is AFastFacet, AHasGovernors, AHasMembers {
  using LibAddressSet for LibAddressSet.Data;
  /// Structs.

  /**
   * @notice This structure isn't used anywhere in storage. Instead, it
   * allows various methods of the contract to return all the flags
   * associated with a given address in one go.
   */
  struct Flags {
    /// @notice Whether or not the item in scope is considered a governor of this FAST.
    bool isGovernor;
    /// @notice Whether or not the item in scope is considered a member of this FAST.
    bool isMember;
  }

  /// AHasGovernors implementation.

  function isGovernorsManager(address who)
      internal view override(AHasGovernors) returns(bool) {
    return _isIssuerMember(who);
  }

  function isValidGovernor(address who)
      internal view override(AHasGovernors) returns(bool) {
    return _isMarketplaceMember(who) && AHasMembers(address(this)).isMember(who);
  }

  function onGovernorAdded(address governor)
      internal override(AHasGovernors) {
    // Notify issuer that this governor was added to this FAST.
    IssuerAccessFacet(LibFast.data().issuer).governorAddedToFast(governor);
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  function onGovernorRemoved(address governor)
      internal override(AHasGovernors) {
    // Notify issuer that this governor was removed from this FAST.
    IssuerAccessFacet(LibFast.data().issuer).governorRemovedFromFast(governor);
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  /// AHasMembers implementation.

  function isMembersManager(address who)
      internal view override(AHasMembers) returns(bool) {
    return
      AHasGovernors(this).isGovernor(who) ||
      AHasAutomatons(address(this)).automatonCan(who, FAST_PRIVILEGE_MANAGE_MEMBERS);
  }

  function isValidMember(address who)
      internal view override(AHasMembers) returns(bool) {
    return _isMarketplaceMember(who);
  }

  function onMemberAdded(address member)
      internal override(AHasMembers) {
    // Notify marketplace that this member was added to this FAST.
    MarketplaceAccessFacet(LibFast.data().marketplace).memberAddedToFast(member);
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  function onMemberRemoved(address member)
      internal override(AHasMembers) {
    // Notify token facet that this member was removed.
    FastTokenFacet(address(this)).beforeRemovingMember(member);
    // Notify marketplace that this member was removed from this FAST.
    MarketplaceAccessFacet(LibFast.data().marketplace).memberRemovedFromFast(member);
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  /// Flags.

  /**
   * @notice Retrieves flags for a given address.
   * @param a is the address to retrieve flags for.
   * @return A `Flags` struct.
   */
  function flags(address a)
      external view returns(Flags memory) {
    return Flags({
        isGovernor: AHasGovernors(address(this)).isGovernor(a),
        isMember: AHasMembers(this).isMember(a)
      });
  }
}
