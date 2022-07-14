// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


interface IExchangeEvents {
  // IHasMembers.

  event MemberAdded(address indexed governor);
  event MemberRemoved(address indexed governor);

  // IHasActiveMembers.
  event MemberActivated(address indexed member);
  event MemberDeactivated(address indexed member);
}
