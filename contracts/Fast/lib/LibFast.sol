// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../Spc.sol';
import '../../Exchange.sol';
import '../../lib/LibHelpers.sol';


library LibFast {
  struct Data {
    Spc spc;
    Exchange exchange;
  }

  function data()
      internal pure returns(Data storage s) {
    bytes32 pos = keccak256('Fast.storage.Fast');
    assembly {s.slot := pos}
  }

  /**
  * @dev This function allows contracts of the FAST network to request ETH
  * provisioning to arbitrary addresses.
  */
  function payUpTo(address payable recipient, uint256 amount)
      internal {
    amount = LibHelpers.upTo(recipient, amount);
    // Transfer some eth!
    recipient.transfer(amount);
  }
}
