// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

library HelpersLib {
  function upTo(address recipient, uint256 amount)
      public view returns(uint256) {
    // If the recipient has more than what is ought to be paid, return.
    uint256 recipientBalance = recipient.balance;
    if (recipientBalance >= amount) { return 0; }
    // If the recipient has some Eth we should only pay the top-up.
    amount = amount - recipientBalance;
    // If the available eth is less than what we should pay, just cap it.
    uint256 available = address(this).balance;
    if (available < amount) { amount = available; }
    // Provision the new fast with Eth.
    return amount;
  }
}