// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibAddressSet.sol';
import '../../interfaces/IERC173.sol';
import '../lib/index.sol';


/**
* @dev This contract is a group of modifiers that can be used by any facets to guard against
*       certain permissions.
*/
abstract contract AFastFacet {
  using LibAddressSet for LibAddressSet.Data;

  /// Shared methods.

  function thisAddress()
      internal view returns(address) {
    return address(this);
  }

  /// Modifiers.

  /// @dev Ensures that a method can only be called by another facet of the same diamond.
  modifier diamondInternal() {
    require(msg.sender == thisAddress(), LibFast.REQUIRES_DIAMOND_CALLER);
    _;
  }

  /// @dev Ensures that a method can only be called by the owner of this diamond.
  modifier diamondOwner() {
    require(msg.sender == IERC173(thisAddress()).owner(), LibFast.REQUIRES_MEMBERSHIP);
    _;
  }

  /// @dev Ensures that the given address is a member of the overarching SPC contract.
  modifier spcMembership(address a) {
    require(LibFast.data().spc.isMember(a), LibFast.REQUIRES_SPC_MEMBERSHIP);
    _;
  }

  /// @dev Ensures that the given address is a governor of the current FAST.
  modifier governance(address a) {
    require(LibFastAccess.data().governorSet.contains(a), LibFast.REQUIRES_FAST_GOVERNORSHIP);
    _;
  }

  /// @dev Ensures that the given address is a member of the current FAST.
  modifier membership(address a) {
    require(LibFastAccess.data().memberSet.contains(a), LibFast.REQUIRES_FAST_MEMBERSHIP);
    _;
  }
}
