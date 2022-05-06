// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "./ISpc.sol";

interface IFastAccess {
  // Governance related functions.
  function isGovernor(address c) external view returns(bool);
  // Membership related functions.
  function isMember(address c) external view returns(bool);
  function addMember(address c) external;
}
