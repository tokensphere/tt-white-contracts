// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../interfaces/ISpc.sol';
import '../../interfaces/IExchange.sol';
import '../../lib/LibHelpers.sol';


library LibFast {
  struct Data {
    ISpc spc;
    IExchange exchange;
  }

  function data()
      internal pure returns(Data storage s) {
    bytes32 pos = keccak256("Fast.storage.Fast");
    assembly {s.slot := pos}
  }

  /**
  * @dev This function allows contracts of the FAST network to request ETH
  * provisioning to arbitrary addresses.
  */
  function payUpTo(address payable recipient, uint256 amount)
      internal {
    // Make sure that the caller is the diamond contract. No other callers should
    // be allowed to request to provision Eth otherwise.
    require(msg.sender == address(this), 'Cannot be called directly');

    amount = LibHelpers.upTo(recipient, amount);
    // Transfer some eth!
    recipient.transfer(amount);
  }
}
