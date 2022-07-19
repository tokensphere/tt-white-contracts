// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibConstants.sol';
import '../../lib/LibAddressSet.sol';
import '../lib/LibExchange.sol';
import '../lib/LibExchangeAccess.sol';
import '../../interfaces/IERC173.sol';
import '../../interfaces/IHasMembers.sol';
import './IExchangeEvents.sol';


/**
* @dev This contract is a group of modifiers that can be used by any Exchange facets to guard against
*       certain permissions.
*/
abstract contract AExchangeFacet is IExchangeEvents {
  using LibAddressSet for LibAddressSet.Data;

  // Modifiers.

  /// @dev Ensures that a method can only be called by the singleton deployer contract factory.
  modifier onlyDeployer() {
    require(
      msg.sender == LibConstants.DEPLOYER_CONTRACT,
      LibConstants.INTERNAL_METHOD
    );
    _;
  }

  /** @dev Requires that the message sender is a member of the linked SPC.
   */
  modifier onlySpcMember() {
    require(
      IHasMembers(LibExchange.data().spc).isMember(msg.sender),
      LibConstants.REQUIRES_SPC_MEMBERSHIP
    );
    _;
  }

  /** @dev Requires that the given address is a member of the exchange.
   *  @param candidate is the address to be checked.
   */
  modifier onlyMember(address candidate) {
    require(
      LibExchangeAccess.data().memberSet.contains(candidate),
      LibConstants.REQUIRES_EXCHANGE_MEMBERSHIP
    );
    _;
  }
}
