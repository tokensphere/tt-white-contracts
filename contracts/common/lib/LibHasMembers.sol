// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../lib/LibAddressSet.sol';


library LibHasMembers {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is `keccak256('HasMembers.storage.Main')`.
  bytes32 internal constant STORAGE_SLOT = 0xd56529bfa3ed57257eed4751494e1d0c0f212cfe38768380e006e3bee06ffb91;

  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    /// @notice This is where we hold our automatons data.
    LibAddressSet.Data memberSet;
  }

  function data() internal pure
      returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
