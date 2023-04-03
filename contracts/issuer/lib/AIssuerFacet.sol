// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../lib/LibConstants.sol';
import '../../lib/LibHelpers.sol';
import '../../lib/LibAddressSet.sol';
import '../../interfaces/IERC173.sol';
import '../../interfaces/ICustomErrors.sol';
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
  modifier onlyDiamondFacet() virtual {
    if (msg.sender != address(this)) {
      revert ICustomErrors.InternalMethod();
    }
    _;
  }

  /// @notice Ensures that a method can only be called by the owner of this diamond.
  modifier onlyDiamondOwner() virtual {
    if (msg.sender != IERC173(address(this)).owner()) {
      revert ICustomErrors.RequiresDiamondOwnership(msg.sender);
    }
    _;
  }

  /// @notice Ensures that the given address is a member of the current FAST.
  modifier onlyMember(address candidate) virtual {
    if (!LibIssuerAccess.data().memberSet.contains(candidate)) {
      revert ICustomErrors.RequiresIssuerMembership(candidate);
    }
    _;
  }
}
