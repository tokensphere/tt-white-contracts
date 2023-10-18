// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./lib/LibHasForwarder.sol";
import "@opengsn/contracts/src/ERC2771Recipient.sol";

/**
 * @title The Forwarder Smart Contract.
 * @notice The HasForwarder abstract contract is in charge of...
 */
abstract contract AHasForwarder is ERC2771Recipient {
  /**
   * @notice ERC2771Recipient implementation.
   * TODO: FIX MODIFIER
   */
  function setTrustedForwarder(address _forwarderAddress) external {
    LibHasForwarder.Data storage ds = LibHasForwarder.data();
    ds.forwarderAddress = _forwarderAddress;
    _setTrustedForwarder(_forwarderAddress);
  }
}
