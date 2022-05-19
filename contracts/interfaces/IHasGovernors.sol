// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


interface IHasGovernors {
  event GovernorAdded(address indexed governor);
  event GovernorRemoved(address indexed governor);

  function isGovernor(address a) external view returns(bool);
  function governorCount() external view returns(uint256);
  function paginateGovernors(uint256 index, uint256 perPage) external view returns(address[] memory, uint256);
  function addGovernor(address payable a) external;
  function removeGovernor(address a) external;
}
