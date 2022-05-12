// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import './interfaces/ISpc.sol';
import './interfaces/IFastRegistry.sol';
import './interfaces/IFastAccess.sol';
import './interfaces/IFastHistory.sol';
import './interfaces/IFastToken.sol';

contract FastRegistry is Initializable, IFastRegistry {
  /// Events.

  event AccessAddressSet(address indexed access);
  event HistoryAddressSet(address indexed history);
  event TokenAddressSet(address indexed token);

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

  function provisionWithEth()
      external payable {
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
  }

  function setHistoryAddress(IFastHistory _history)
      external spcMembership(msg.sender) {
    history = _history;
  }

  function setTokenAddress(IFastToken _token)
      external spcMembership(msg.sender) {
    token = _token;
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
    
    // If the recipient has more than what is ought to be paid, return.
    uint256 recipientBalance = recipient.balance;
    if (recipientBalance >= amount) { return; }
    // If the recipient has some Eth we should only pay the top-up.
    amount = amount - recipientBalance;
    // If the available eth is less than what we should pay, just cap it.
    uint256 available = address(this).balance;
    if (available < amount) { amount = available; }

    // Transfer some eth!
    recipient.transfer(amount);
  }

  /// Modifiers.

  modifier spcMembership(address a) {
    require(spc.isMember(a), 'Missing SPC membership');
    _;
  }
}