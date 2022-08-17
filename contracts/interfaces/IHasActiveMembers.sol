// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;


interface IHasActiveMembers {
  function isMemberActive(address member) external view returns(bool);
  function deactivateMember(address payable member) external;
  function activateMember(address member) external;
}
