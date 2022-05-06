// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


interface ISpc {
  function isGovernor(address c) external view returns (bool);
}
