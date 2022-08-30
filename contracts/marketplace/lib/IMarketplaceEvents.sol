// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


interface IMarketplaceEvents {
  // IHasMembers.

  event MemberAdded(address indexed member);
  event MemberRemoved(address indexed member);

  // IHasActiveMembers.
  event MemberActivated(address indexed member);
  event MemberDeactivated(address indexed member);
}
