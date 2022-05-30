// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './ISpc.sol';
import './IExchange.sol';
import './IFastAccess.sol';
import './IFastToken.sol';
import './IFastHistory.sol';

interface IFastRegistry {
  function spc() external view returns(ISpc);
  function exchange() external view returns(IExchange);
  function access() external view returns(IFastAccess);
  function token() external view returns(IFastToken);
  function history() external view returns(IFastHistory);
  function payUpTo(address payable a, uint256 amount) external;
  function provisionWithEth() external payable;
}
