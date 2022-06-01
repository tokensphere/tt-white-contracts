// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibConstants.sol';
import '../../lib/LibHelpers.sol';
import '../../lib/LibAddressSet.sol';
import '../../interfaces/IHasMembers.sol';
import '../../interfaces/IERC173.sol';
import '../lib/LibFast.sol';
import '../lib/LibFastAccess.sol';
import '../lib/LibFastToken.sol';


/**
* @dev This contract is a group of modifiers that can be used by any facets to guard against
*       certain permissions.
*/
abstract contract AFastFacet {
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

  /// @dev Ensures that a method can only be called by the singleton deployer contract factory.
  modifier deployerContract() {
    require(msg.sender == LibConstants.DEPLOYER_CONTRACT, LibConstants.INTERNAL_METHOD);
    _;
  }

  /** @dev Ensures that the given address is **not** a contract.
   *  @param a The address to check.
   */
  modifier nonContract(address a) {
    require(!LibHelpers.isContract(a), LibConstants.REQUIRES_NON_CONTRACT_ADDR);
    _;
  }

  /** @dev Ensures that the given address is a member of the Exchange.
   *  @param a The address to check.
   */
  modifier exchangeMember(address a) {
    require(IHasMembers(LibFast.data().exchange).isMember(a), LibConstants.REQUIRES_EXCHANGE_MEMBERSHIP);
    _;
  }

  /** @dev Ensures that the given address is a member of the SPC.
   *  @param a The address to check.
   */
  modifier spcMembership(address a) {
    require(IHasMembers(LibFast.data().spc).isMember(a), LibConstants.REQUIRES_SPC_MEMBERSHIP);
    _;
  }

  /** @dev Ensures that the given address is a governor of the FAST.
   *  @param a The address to check.
   */
  modifier governance(address a) {
    require(LibFastAccess.data().governorSet.contains(a), LibConstants.REQUIRES_FAST_GOVERNORSHIP);
    _;
  }

  /** @dev Ensures that the given address is a member of the FAST.
   *  @param a The address to check.
   */
  modifier membership(address a) {
    require(LibFastAccess.data().memberSet.contains(a), LibConstants.REQUIRES_FAST_MEMBERSHIP);
    _;
  }

  /** @dev Ensures that the given address is a member of the current FAST or the Zero Address.
   *  @param a The address to check.
   */
  modifier membershipOrZero(address a) {
    require(
      LibFastAccess.data().memberSet.contains(a) ||
      (LibFastToken.data().isSemiPublic && IHasMembers(LibFast.data().exchange).isMember(a)) ||
        a == address(0),
      LibConstants.REQUIRES_FAST_MEMBERSHIP
    );
    _;
  }
}
