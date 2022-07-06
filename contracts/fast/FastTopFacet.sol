// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../lib/LibConstants.sol';
import '../lib/LibHelpers.sol';
import './lib/AFastFacet.sol';
import './lib/LibFast.sol';
import './FastAccessFacet.sol';
import './FastTokenFacet.sol';

contract FastTopFacet is AFastFacet {

  // Eth provisioning related events.
  event EthReceived(address indexed from, uint256 amount);
  event EthDrained(address indexed to, uint256 amount);

  // Getters.

  function spcAddress()
      external view returns(address) {
    return LibFast.data().spc;
  }

  function exchangeAddress()
      external view returns(address) {
    return LibFast.data().exchange;
  }

  // Provisioning functions.

  function provisionWithEth()
      external payable {
    require(msg.value > 0, LibConstants.MISSING_ATTACHED_ETH);
    emit EthReceived(msg.sender, msg.value);
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  function drainEth()
      external
      spcMembership {
    uint256 amount = payable(address(this)).balance;
    payable(msg.sender).transfer(amount);
    emit EthDrained(msg.sender, amount);
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  /**
  * @dev This function allows contracts of the FAST network to request ETH
  * provisioning to arbitrary addresses.
  */
  function payUpTo(address payable recipient, uint256 amount)
      external diamondInternal() {
    require(recipient != address(0), LibConstants.REQUIRES_NON_ZERO_ADDRESS);
    amount = LibHelpers.upTo(recipient, amount);
    // Transfer some eth!
    if (amount != 0) { recipient.transfer(amount); }
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }
}
