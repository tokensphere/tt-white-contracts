// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../lib/LibAddressSet.sol";

library LibHasGovernors {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is `keccak256('HasGovernors.storage.Main')`.
  bytes32 internal constant STORAGE_SLOT = 0xdac4df64cf6992e5f0fa766abc48a6698b638db4d8eeee68133c41fdd4862975;

  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    /// @notice This is where we hold our automatons data.
    LibAddressSet.Data governorSet;
  }

  function data() internal pure returns (Data storage s) {
    assembly {
      s.slot := STORAGE_SLOT
    }
  }
}
