// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

library LibHasForwarder {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is `keccak256('HasForwarder.storage.Main')`.
  bytes32 internal constant STORAGE_SLOT = 0xa9930c2ffa1b605b0243ba36b3020146bcba5a29c05a711f5ca7c705a8e851ca;

  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    /// @notice This is where we store the trusted forwarder address.
    address forwarderAddress;
  }

  function data() internal pure returns (Data storage s) {
    assembly {
      s.slot := STORAGE_SLOT
    }
  }
}
