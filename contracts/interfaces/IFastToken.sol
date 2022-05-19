// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import './IERC20.sol';
import './IERC1404.sol';


interface IFastToken is IERC20, IERC1404 {
  function symbol() external returns(string memory);
  function beforeRemovingMember(address member) external;
}
