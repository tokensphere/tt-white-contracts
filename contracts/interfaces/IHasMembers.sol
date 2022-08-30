// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


interface IHasMembers {
  function isMember(address member) external view returns(bool);
  function memberCount() external view returns(uint256);
  function paginateMembers(uint256 index, uint256 perPage) external view returns(address[] memory, uint256);
  function addMember(address payable member) external;
  function removeMember(address member) external;
}
