// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibConstants.sol';
import '../../lib/LibHelpers.sol';
import '../../lib/LibAddressSet.sol';
import '../../interfaces/IHasMembers.sol';
import '../../interfaces/IHasGovernors.sol';
import '../../interfaces/IHasActiveMembers.sol';
import '../../interfaces/IERC173.sol';
import '../lib/LibFast.sol';
import './IFastEvents.sol';


/**
* @dev This contract is a group of modifiers that can be used by any facets to guard against
*       certain permissions.
*/
abstract contract AFastFacet is IFastEvents {
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

  /// @dev Ensures that a method can only be called by the singleton deployer contract factory.
  modifier onlyDeployer() {
    require(
      msg.sender == LibConstants.DEPLOYER_CONTRACT,
      LibConstants.INTERNAL_METHOD
    );
    _;
  }

  /** @dev Ensures that the given address is **not** a contract.
   *  @param candidate The address to check.
   */
  modifier nonContract(address candidate) { // Exploitable, see LibHelpers.isContract
    require(
      !LibHelpers.isContract(candidate),
      LibConstants.REQUIRES_NON_CONTRACT_ADDR
    );
    _;
  }

  /** @dev Ensures that the given address is a member of the Exchange.
   *  @param candidate The address to check.
   */
  modifier onlyExchangeMember(address candidate) {
    require(
      IHasMembers(LibFast.data().exchange).isMember(candidate),
      LibConstants.REQUIRES_EXCHANGE_MEMBERSHIP
    );
    _;
  }

  /** @dev Ensures a candidate is active.
   *  @param candidate The address to check activation status on.
   */
  modifier onlyExchangeActiveMember(address candidate) {
    require(
      IHasActiveMembers(LibFast.data().exchange).isMemberActive(candidate),
      LibConstants.REQUIRES_EXCHANGE_ACTIVE_MEMBER
    );
    _;
  }

  /** @dev Ensures that the message sender is a member of the SPC.
   */
  modifier onlySpcMember() {
    require(
      IHasMembers(LibFast.data().spc).isMember(msg.sender),
      LibConstants.REQUIRES_SPC_MEMBERSHIP
    );
    _;
  }

  /** @dev Ensures that the given address is a governor of the FAST.
   *  @param candidate The address to check.
   */
  modifier onlyGovernor(address candidate) {
    require(
      IHasGovernors(address(this)).isGovernor(candidate),
      LibConstants.REQUIRES_FAST_GOVERNORSHIP
    );
    _;
  }

  /** @dev Ensures that the given address is a member of the FAST.
   *  @param candidate The address to check.
   */
  modifier onlyMember(address candidate) {
    require(
      IHasMembers(address(this)).isMember(candidate),
      LibConstants.REQUIRES_FAST_MEMBERSHIP
    );
    _;
  }

  /** @dev Ensures address a is different from address b.
   *  @param a Address a
   *  @param b Address b
   */
  modifier differentAddresses(address a, address b) {
    require(a != b, LibConstants.REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT);
    _;
  }
}
