// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibConstants.sol';
import '../../lib/LibAddressSet.sol';
import '../../interfaces/IERC173.sol';
import '../lib/LibSpcAccess.sol';
import './ISpcEvents.sol';


/**
* @dev This contract is a group of modifiers that can be used by any facets to guard against
*       certain permissions.
*/
abstract contract ASpcFacet is ISpcEvents {
  using LibAddressSet for LibAddressSet.Data;

  /// Modifiers.

  /// @dev Ensures that a method can only be called by another facet of the same diamond.
  modifier onlyDiamondFacet() {
    require(
      msg.sender == address(this),
      LibConstants.INTERNAL_METHOD
    );
    _;
  }

  /// @dev Ensures that a method can only be called by the owner of this diamond.
  modifier onlyDiamondOwner() {
    require(
      msg.sender == IERC173(address(this)).owner(),
      LibConstants.REQUIRES_DIAMOND_OWNERSHIP
    );
    _;
  }

  /// @dev Ensures that the given address is a member of the current FAST.
  modifier onlyMember(address candidate) {
    require(
      LibSpcAccess.data().memberSet.contains(candidate),
      LibConstants.REQUIRES_SPC_MEMBERSHIP
    );
    _;
  }
}
