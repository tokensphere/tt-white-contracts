// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


interface IMarketplaceEvents {
  // IHasAutomatons
  event AutomatonPrivilegesSet(address indexed automaton, uint256 indexed privileges);
  event AutomatonRemoved(address indexed automaton);

  // IHasMembers.
  event MemberAdded(address indexed member);
  event MemberRemoved(address indexed member);

  // IHasActiveMembers.
  event MemberActivated(address indexed member);
  event MemberDeactivated(address indexed member);
}
