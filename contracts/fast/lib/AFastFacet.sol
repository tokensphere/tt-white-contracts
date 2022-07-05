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
   *  @param candidate The address to check.
   */
  modifier nonContract(address candidate) {
    require(!LibHelpers.isContract(candidate), LibConstants.REQUIRES_NON_CONTRACT_ADDR);
    _;
  }

  /** @dev Ensures that the given address is a member of the Exchange.
   *  @param candidate The address to check.
   */
  modifier exchangeMember(address candidate) {
    require(
      IHasMembers(LibFast.data().exchange).isMember(candidate),
      LibConstants.REQUIRES_EXCHANGE_MEMBERSHIP
    );
    _;
  }

  /** @dev Ensures that the message sender is a member of the SPC.
   */
  modifier spcMembership() {
    require(
      IHasMembers(LibFast.data().spc).isMember(msg.sender),
      LibConstants.REQUIRES_SPC_MEMBERSHIP
    );
    _;
  }

  /** @dev Ensures that the given address is a governor of the FAST.
   *  @param candidate The address to check.
   */
  modifier governance(address candidate) {
    require(
      LibFastAccess.data().governorSet.contains(candidate),
      LibConstants.REQUIRES_FAST_GOVERNORSHIP
    );
    _;
  }

  /** @dev Ensures that the given address is a member of the FAST.
   *  @param candidate The address to check.
   */
  modifier membership(address candidate) {
    require(
      LibFastAccess.data().memberSet.contains(candidate),
      LibConstants.REQUIRES_FAST_MEMBERSHIP
    );
    _;
  }

  /** @dev Ensures that the given address is a member of the current FAST or the Zero Address.
   *  @param candidate The address to check.
   */
  modifier canHoldTokens(address candidate) {
    // Only perform checks if the address is non-zero.
    if (candidate != address(0)) {
    // FAST is semi-public - the only requirement to hold tokens is to be an exchange member.
      if (LibFastToken.data().isSemiPublic) {
        require(
          IHasMembers(LibFast.data().exchange).isMember(candidate),
          LibConstants.REQUIRES_EXCHANGE_MEMBERSHIP
        );
      }
      // FAST is private, the requirement to hold tokens is to be a member of that FAST.
      else {
        require(
          LibFastAccess.data().memberSet.contains(candidate),
          LibConstants.REQUIRES_FAST_MEMBERSHIP
        );
      }
    }
    _;
  }
}
