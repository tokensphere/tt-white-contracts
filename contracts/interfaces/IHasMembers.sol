// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


interface IHasMembers {
  event MemberAdded(address indexed member);
  event MemberRemoved(address indexed member);

  function isMember(address a) external view returns(bool);
  function memberCount() external view returns(uint256);
  function paginateMembers(uint256 index, uint256 perPage) external view returns(address[] memory, uint256);
  function addMember(address payable a) external;
  function removeMember(address a) external;
}
