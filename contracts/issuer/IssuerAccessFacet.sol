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
    return AHasMembers(this).isMember(who);
  }

  function isValidMember(address who)
      internal pure override(AHasMembers) returns(bool) {
    return who != LibHelpers.ZERO_ADDRESS;
  }
}
