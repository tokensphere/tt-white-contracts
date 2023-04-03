// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../lib/LibHelpers.sol';
import '../common/AHasMembers.sol';
import '../interfaces/ICustomErrors.sol';
import '../fast/FastTopFacet.sol';
import '../fast/FastTokenFacet.sol';
import './lib/AIssuerFacet.sol';
import './lib/LibIssuerAccess.sol';
import './lib/IIssuerEvents.sol';
import '../issuer/IssuerTopFacet.sol';


contract IssuerAccessFacet is AIssuerFacet, AHasMembers {
  using LibAddressSet for LibAddressSet.Data;
  /// AHasMembers implementation.

  function isMembersManager(address who)
      internal view override(AHasMembers) returns(bool) {
    return _isMember(who);
  }

  function isValidMember(address who)
      internal pure override(AHasMembers) returns(bool) {
    return who != LibHelpers.ZERO_ADDRESS;
  }

  /// Membership management.

  /** @notice Callback from FAST contracts allowing the Issuer contract to keep track of governorships.
   * @param governor The governor added to a FAST.
   */
  function governorAddedToFast(address governor)
      external {
    // Verify that the given address is in fact a registered FAST contract.
    if (!IssuerTopFacet(address(this)).isFastRegistered(msg.sender)) {
      revert ICustomErrors.RequiresFastContractCaller();
    }
    // Keep track of the governorship.
    LibIssuerAccess.data().fastGovernorships[governor].add(msg.sender, false);

    emit GovernorshipAdded(msg.sender, governor);
  }

  /** @notice Callback from FAST contracts allowing the Issuer contract to keep track of governorships.
   * @param governor The governor removed from a FAST.
   */
  function governorRemovedFromFast(address governor)
      external {
    // Verify that the given address is in fact a registered FAST contract.
    if (!IssuerTopFacet(address(this)).isFastRegistered(msg.sender)) {
      revert ICustomErrors.RequiresFastContractCaller();
    }
    // Remove the tracked governorship.
    LibIssuerAccess.data().fastGovernorships[governor].remove(msg.sender, false);

    emit GovernorshipRemoved(msg.sender, governor);
  }

  /** @notice Returns a list of FASTs that the passed address is a governor of.
   * @param governor is the address to check governorships of.
   * @param cursor is the index at which to start.
   * @param perPage is how many records should be returned at most.
   * @return A `address[]` list of values at most `perPage` big.
   * @return A `uint256` index to the next page.
   */
  function paginateGovernorships(address governor, uint256 cursor, uint256 perPage)
      external view
      returns(address[] memory, uint256) {
    return LibPaginate.addresses(LibIssuerAccess.data().fastGovernorships[governor].values, cursor, perPage);
  }
}
