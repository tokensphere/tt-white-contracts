// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

library LibHelpers {
  function upTo(address payable to, uint256 amount)
      internal view returns(uint256) {
    // If the recipient has more than what is ought to be paid, return.
    uint256 toBalance = to.balance;
    if (toBalance >= amount) { return 0; }
    // If the recipient has some Eth we should only pay the top-up.
    amount = amount - toBalance;
    // If the available eth is less than what we should pay, just cap it.
    uint256 available = payable(address(this)).balance;
    if (available < amount) { amount = available; }
    // Provision the new fast with Eth.
    return amount;
  }

  function isContract(address target)
      internal view returns (bool) {
    uint32 size;
    assembly { size := extcodesize(target) }
    return (size > 0);
  }
}
