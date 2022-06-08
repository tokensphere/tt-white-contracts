// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './lib/LibFast.sol';
import './interfaces/AFastFacet.sol';

contract FastFacet is AFastFacet {
  /// Events.

  // Eth provisioning related events.
  event EthReceived(address indexed from, uint256 amount);
  event EthDrained(address indexed to, uint256 amount);

  /// Public functions.

  function provisionWithEth()
      external payable {
    require(msg.value > 0, LibFast.MISSING_ATTACHED_ETH);
    emit EthReceived(msg.sender, msg.value);
  }

  function drainEth()
      external
      spcMembership(msg.sender) {
    uint256 amount = address(this).balance;
    payable(msg.sender).transfer(amount);
    emit EthDrained(msg.sender, amount);
  }
}
