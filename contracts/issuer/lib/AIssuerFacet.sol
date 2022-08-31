// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../lib/LibConstants.sol';
import '../../lib/LibHelpers.sol';
import '../../lib/LibAddressSet.sol';
import '../../interfaces/IERC173.sol';
import '../lib/LibIssuerAccess.sol';
import './IIssuerEvents.sol';


/**
* @notice This abstract contract encapsulates modifiers allowing inheriting facets to guard against
* certain permissions.
*/
abstract contract AIssuerFacet is IIssuerEvents {
  using LibAddressSet for LibAddressSet.Data;

  /// Modifiers.

  /// @notice Ensures that a method can only be called by another facet of the same diamond.
  modifier onlyDiamondFacet() {
    require(
      msg.sender == address(this),
      LibConstants.INTERNAL_METHOD
    );
    _;
  }

  /// @notice Ensures that a method can only be called by the owner of this diamond.
  modifier onlyDiamondOwner() {
    require(
      msg.sender == IERC173(address(this)).owner(),
      LibConstants.REQUIRES_DIAMOND_OWNERSHIP
    );
    _;
  }

  /// @notice Ensures that the given address is a member of the current FAST.
  modifier onlyMember(address candidate) {
    require(
      LibIssuerAccess.data().memberSet.contains(candidate),
      LibConstants.REQUIRES_ISSUER_MEMBERSHIP
    );
    _;
  }
}
