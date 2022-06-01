// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../interfaces/IERC20.sol';
import '../interfaces/IERC1404.sol';
import '../interfaces/ISpc.sol';
import '../interfaces/IExchange.sol';
import '../interfaces/IHasMembers.sol';
import '../interfaces/IHasGovernors.sol';
import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import './lib/LibFast.sol';
import './lib/LibFast.sol';
import './lib/LibFastAccess.sol';
import './lib/LibFastToken.sol';

contract FastFacet {
  using LibAddressSet for LibAddressSet.Data;

  /// Events.

  // Eth provisioning related events.
  event EthReceived(address indexed from, uint256 amount);
  event EthDrained(address indexed to, uint256 amount);

  /// Public functions.

  function provisionWithEth()
      external payable {
    require(msg.value > 0, 'Missing attached ETH');
    emit EthReceived(msg.sender, msg.value);
  }

  function drainEth()
      spcMembership(msg.sender)
      external {
    uint256 amount = address(this).balance;
    payable(msg.sender).transfer(amount);
    emit EthDrained(msg.sender, amount);
  }

  /// Modifiers.

  modifier diamondInternal() {
    require(msg.sender == address(this), 'Cannot be called directly');
    _;
  }

  modifier spcMembership(address a) {
    require(LibFast.data().spc.isMember(a), 'Missing governorship');
    _;
  }
}
