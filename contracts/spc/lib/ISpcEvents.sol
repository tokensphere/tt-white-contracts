// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


// WARNING: These events must be maintained 1:1 with LibSpcEvents!
// They also should never be emitted directly, they only help us defining
// typescript types!
interface ISpcEvents {
  event EthReceived(address indexed from, uint256 amount);
  event EthDrained(address indexed to, uint256 amount);
  event FastRegistered(address indexed fast);
  event MemberAdded(address indexed governor);
  event MemberRemoved(address indexed governor);
}
