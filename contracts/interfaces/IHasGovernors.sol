// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


interface IHasGovernors {
  function isGovernor(address governor) external view returns(bool);
  function governorCount() external view returns(uint256);
  function paginateGovernors(uint256 index, uint256 perPage) external view returns(address[] memory, uint256);
  function addGovernor(address payable governor) external;
  function removeGovernor(address governor) external;
}
