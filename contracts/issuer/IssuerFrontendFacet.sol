// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibPaginate.sol';
import '../fast/FastFrontendFacet.sol';
import './lib/AIssuerFacet.sol';
import './lib/LibIssuer.sol';


contract IssuerFrontendFacet is AIssuerFacet {

  // Public functions.

  /** @dev Paginates the FAST diamonds registered with this Issuer based on a starting cursor and
   *        a number of records per page. It returns rich details for each FAST diamond.
   *  @param cursor The index at which to start.
   *  @param perPage How many records should be returned at most.
   *  @return A `address[]` list of values at most `perPage` big.
   *  @return A `uint256` index to the next page.
   */
  function paginateDetailedFasts(uint256 cursor, uint256 perPage)
      external view
      returns(FastFrontendFacet.Details[] memory, uint256) {
    (address[] memory addresses, uint256 nextCursor) = LibPaginate.addresses(LibIssuer.data().fastSet.values, cursor, perPage);
    FastFrontendFacet.Details[] memory fastDetails = new FastFrontendFacet.Details[](addresses.length);
    for (uint256 i = 0; i < addresses.length; ++i) {
      address fast = addresses[i];
      fastDetails[i] = FastFrontendFacet(fast).details();
    }
    return (fastDetails, nextCursor);
  }
}
