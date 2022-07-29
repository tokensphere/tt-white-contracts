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

  // Exploitable: https://ethereum.stackexchange.com/questions/14015/iscontract-function-using-evm-assembly-to-get-the-address-code-size/14016#14016
  // The reddit post on the stackexchange answer above describes the exploit, and it's quite interesting!
  // Also consider this https://docs.ethhub.io/ethereum-roadmap/ethereum-2.0/account-abstraction/ coming in the future, I've read a few opinions
  // and it seems developers shouldn't care what type of account is calling and should instead safeguard against reentrancy.
  // On the plus side all the places that use this helper function have other guards that block exploits (from what I could tell!).
  function isContract(address target)
      internal view returns (bool) {
    uint32 size;
    assembly { size := extcodesize(target) }
    return (size > 0);
  }
}
