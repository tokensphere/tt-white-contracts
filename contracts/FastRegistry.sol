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

  function setSpcAddress(ISpc _spc)
      external spcMembership {
    spc = _spc;
  }

  function setAccessAddress(IFastAccess _access)
      external spcMembership {
    access = _access;
  }

  function setTokenAddress(IFastToken _token)
      external spcMembership {
    token = _token;
  }

  function setHistoryAddress(IFastHistory _history)
      external spcMembership {
    history = _history;
  }

  /// Modifiers.

  modifier spcMembership() {
    require(spc.isMember(msg.sender), 'Missing SPC membership');
    _;
  }
}