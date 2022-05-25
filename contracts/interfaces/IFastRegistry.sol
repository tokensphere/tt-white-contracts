// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './ISpc.sol';
import './IFastAccess.sol';
import './IFastToken.sol';
import './IFastHistory.sol';

interface IFastRegistry {
  function spc() external returns(ISpc);
  function access() external returns(IFastAccess);
  function token() external returns(IFastToken);
  function history() external returns(IFastHistory);
  function payUpTo(address payable a, uint256 amount) external;
  function provisionWithEth() external payable;
}
