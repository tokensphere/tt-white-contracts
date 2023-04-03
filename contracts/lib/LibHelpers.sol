// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import './LibHelpers.sol';
import '../interfaces/IERC173.sol';

library LibHelpers {
  address internal constant ZERO_ADDRESS = address(0);
  address internal constant DEPLOYER_CONTRACT = 0x6DF2D25d8C6FD680730ee658b530A05a99BB769a;

  function _isDiamondFacet(address who)
      internal view returns(bool) {
    return who == address(this);
  }
  
  function _isDiamondOwner(address who)
      internal view returns(bool) {
    return who == IERC173(address(this)).owner();
  }

  function _isDeployer(address who)
      internal pure returns(bool) {
    return who == LibHelpers.DEPLOYER_CONTRACT;
  }
}
