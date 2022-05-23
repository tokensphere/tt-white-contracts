// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './IHasMembers.sol';
import './IExchange.sol';

interface ISpc is IHasMembers {
  function exchange() external returns(IExchange);
}
