// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import './interfaces/ISpc.sol';
import './interfaces/IFastRegistry.sol';
import './interfaces/IFastAccess.sol';
import './interfaces/IFastHistory.sol';
import './interfaces/IFastToken.sol';
import './lib/HelpersLib.sol';

/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract FastRegistry is Initializable, IFastRegistry {
  /// Events.

  event AccessAddressSet(IFastAccess indexed access);
  event HistoryAddressSet(IFastHistory indexed history);
  event TokenAddressSet(IFastToken indexed token);

  event EthReceived(address indexed from, uint256 amount);
  event EthDrained(address indexed to, uint256 amount);

  /// Members.

  // The registry holds pointers to various contracts of the ecosystem.
  ISpc public override spc;
  IFastAccess public override access;
  IFastHistory public override history;
  IFastToken public override token;

  function initialize(ISpc _spc)
      public payable
      initializer {
    spc = _spc;
  }

  /// Eth provisioning stuff.

  function provisionWithEth()
      external payable {
    require(msg.value > 0, 'Missing attached ETH');
    emit EthReceived(msg.sender, msg.value);
  }

  function drainEth()
      spcMembership(msg.sender)
      external {
    uint256 amount = address(this).balance;
    payable(msg.sender).transfer(amount);
    emit EthDrained(msg.sender, amount);
  }

  /// Contract setters.

  function setAccessAddress(IFastAccess _access)
      external spcMembership(msg.sender) {
    access = _access;
    emit AccessAddressSet(access);
  }

  function setHistoryAddress(IFastHistory _history)
      external spcMembership(msg.sender) {
    history = _history;
    emit HistoryAddressSet(history);
  }

  function setTokenAddress(IFastToken _token)
      external spcMembership(msg.sender) {
    token = _token;
    emit TokenAddressSet(token);
  }

  /// Eth provisioning.

  /**
  * @dev This function allows other contracts of the FAST network to request ETH
  * provisioning to arbitrary addresses.
  */
  function payUpTo(address payable recipient, uint256 amount)
      external override {
    // Make sure that the caller is the access contract. No other callers should
    // be allowed to request a FastRegistry to provision Eth otherwise.
    require(msg.sender == address(access), 'Cannot be called directly');

    amount = HelpersLib.upTo(recipient, amount);
    // Transfer some eth!
    recipient.transfer(amount);
  }

  /// Modifiers.

  modifier spcMembership(address a) {
    require(spc.isMember(a), 'Missing SPC membership');
    _;
  }
}