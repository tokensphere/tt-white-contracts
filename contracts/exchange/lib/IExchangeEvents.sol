// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


// WARNING: These events must be maintained 1:1 with LibExchangeEvents!
// They also should never be emitted directly, they only help us defining
// typescript types!
interface IExchangeEvents {
  // IHasMembers.

  event MemberAdded(address indexed governor);
  event MemberRemoved(address indexed governor);
}
