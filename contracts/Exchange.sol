// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import './interfaces/IExchange.sol';
import './interfaces/ISpc.sol';


contract Exchange is Initializable, IExchange {

  /// Members.

  ISpc public spc;

  function initialize(ISpc _spc)
      external initializer {
    spc = _spc;
  }

  /// Membership management.

  function isMember(address /*candidate*/)
      external override pure returns(bool) {
    return false;
  }

  function memberCount()
      external override pure returns(uint256) {
    return 0;
  }

  function paginateMembers(uint256 /*cursor*/, uint256 /*perPage*/)
      external override pure returns(address[] memory, uint256) {
    return (new address[](0), 0);
  }

  function addMember(address payable /*member*/)
      membership(msg.sender)
      external override view {
  }

  function removeMember(address /*member*/)
      membership(msg.sender)
      external override view {
  }

  /// Modifiers.

  modifier membership(address /*a*/) {
    require(false, 'Missing Exchange membership');
    _;
  }
}
