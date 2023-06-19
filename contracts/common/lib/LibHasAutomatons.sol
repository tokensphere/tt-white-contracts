// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../lib/LibAddressSet.sol";

library LibHasAutomatons {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is `keccak256('HasAutomatons.storage.Main')`.
  bytes32 internal constant STORAGE_SLOT = 0x3dfe1f2f995ddddfe9572dcdd01e4fb472ed2fb10a125c3b0156e94d073b9183;

  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    /// @notice This is where we hold our automatons data.
    LibAddressSet.Data automatonSet;
    /// @notice This is where we store privileges for each of our automaton account.
    mapping(address => uint32) automatonPrivileges;
  }

  function data() internal pure returns (Data storage s) {
    assembly {
      s.slot := STORAGE_SLOT
    }
  }
}
