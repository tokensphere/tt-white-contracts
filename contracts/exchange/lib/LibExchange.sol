// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibAddressSet.sol';


library LibExchange {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Exchange.storage'):
  bytes32 internal constant STORAGE_SLOT = 0x58cca9481e011ced58c1d520ef5aad456e5805265d66de8df7c52f680c417394;

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    /// @dev The internal pointer to the SPC contract.
    address spc;
    /// @dev This is where we hold our members data.
    LibAddressSet.Data memberSet;
    /// @dev This is where we keep track of our member FAST memberships.
    mapping(address => LibAddressSet.Data) fastMemberships;
  }

  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
