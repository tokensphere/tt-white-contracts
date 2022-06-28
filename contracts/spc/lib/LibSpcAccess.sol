// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibAddressSet.sol';


library LibSpcAccess {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Spc.storage.Access'):
  bytes32 internal constant STORAGE_SLOT = 0xe275f58a6a7f532ee3fa7fff24450c253df494fca407d91f5c35e83236f64d7c;

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    // This is where we hold our members data.
    LibAddressSet.Data memberSet;
  }

  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
