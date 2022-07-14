// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


interface IHasActiveMembers {
  function isMemberActive(address a) external view returns(bool);
  function deactivateMember(address payable a) external;
  function activateMember(address a) external;
}
