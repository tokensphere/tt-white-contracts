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

  // fallback() external payable {
  //   emit EthReceived(msg.sender, msg.value);
  // }

  // receive() external payable {
  //   emit EthReceived(msg.sender, msg.value);
  // }

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
  function ensureEthProvisioning(address payable a, uint256 amount)
      external override {
    // Make sure that the caller is the access contract. No other callers should
    // be allowed to request a FastRegistry to provision Eth otherwise.
    require(msg.sender == address(access), 'Cannot be called directly');
    // Memoize balance.
    uint256 available = address(this).balance;
    // If this contract is storing less than the amount, cap the amount.
    if (amount > available) { amount = available; }
    // If the recipient has more than the amount, don't do anything.
    if (a.balance >= amount) { return; }
    // Otherwise, cap the amount to the missing part from the recipient's balance.
    amount = amount - a.balance;
    // Transfer some eth!
    a.transfer(amount);
  }

  /// Modifiers.

  modifier spcMembership(address a) {
    require(spc.isMember(a), 'Missing SPC membership');
    _;
  }
}