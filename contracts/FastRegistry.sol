// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/ISpc.sol";
import "./interfaces/IFastAccess.sol";
import "./interfaces/IFastToken.sol";
import "./interfaces/IFastHistory.sol";

contract FastRegistry is Initializable {
  /// Members.

  // The registry holds pointers to various contracts of the ecosystem.
  ISpc public spc;
  IFastAccess public access;
  IFastToken public token;
  IFastHistory public history;

  function initialize(ISpc _spc)
      public initializer {
    spc = _spc;
  }

  /// Contract setters.

  function setAccessAddress(IFastAccess _access)
      external spcGovernance {
    access = _access;
  }

  function setTokenAddress(IFastToken _token)
      external spcGovernance {
    token = _token;
  }

  function setHistoryAddress(IFastHistory _history)
      external spcGovernance {
    history = _history;
  }

  /// Modifiers.

  modifier spcGovernance() {
    require(spc.isGovernor(msg.sender), 'Missing SPC governorship');
    _;
  }
}