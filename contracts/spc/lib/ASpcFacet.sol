// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibConstants.sol';
import '../../lib/LibAddressSet.sol';
import '../../interfaces/IERC173.sol';
import '../lib/LibSpc.sol';


/**
* @dev This contract is a group of modifiers that can be used by any facets to guard against
*       certain permissions.
*/
abstract contract ASpcFacet {
  using LibAddressSet for LibAddressSet.Data;

  /// Modifiers.

  /// @dev Ensures that a method can only be called by another facet of the same diamond.
  modifier diamondInternal() {
    require(msg.sender == address(this), LibConstants.INTERNAL_METHOD);
    _;
  }

  /// @dev Ensures that a method can only be called by the owner of this diamond.
  modifier diamondOwner() {
    require(msg.sender == IERC173(address(this)).owner(), LibConstants.REQUIRES_DIAMOND_OWNERSHIP);
    _;
  }

  /// @dev Ensures that the given address is a member of the current FAST.
  modifier membership(address a) {
    require(LibSpc.data().memberSet.contains(a), LibConstants.REQUIRES_SPC_MEMBERSHIP);
    _;
  }
}
