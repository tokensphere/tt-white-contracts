// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibConstants.sol';
import '../../lib/LibAddressSet.sol';
import '../lib/LibExchange.sol';
import '../../interfaces/IERC173.sol';
import '../../interfaces/IHasMembers.sol';


/**
* @dev This contract is a group of modifiers that can be used by any Exchange facets to guard against
*       certain permissions.
*/
abstract contract AExchangeFacet {
  using LibAddressSet for LibAddressSet.Data;

  // Modifiers.

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

  /// @dev Ensures that a method can only be called by the singleton deployer contract factory.
  modifier deployerContract() {
    require(msg.sender == LibConstants.DEPLOYER_CONTRACT, LibConstants.INTERNAL_METHOD);
    _;
  }

  /** @dev Requires that the given address is a member of the linked SPC.
   *  @param candidate is the address to be checked.
   */
  modifier spcMembership(address candidate) {
    require(IHasMembers(LibExchange.data().spc).isMember(candidate), LibConstants.REQUIRES_SPC_MEMBERSHIP);
    _;
  }

  /** @dev Requires that the given address is a member of the exchange.
   *  @param candidate is the address to be checked.
   */
  modifier membership(address candidate) {
    require(LibExchange.data().memberSet.contains(candidate), LibConstants.REQUIRES_FAST_MEMBERSHIP);
    _;
  }
}
