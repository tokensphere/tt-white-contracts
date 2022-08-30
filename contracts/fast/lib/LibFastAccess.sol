// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../lib/LibAddressSet.sol';

library LibFastAccess {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Fast.storage.Access'):
  bytes32 internal constant STORAGE_SLOT = 0x87ed8063ac9ead3b2eb7551ed3d89b29fcbf44d6733084b5c82e95d5120ece9a;

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    /// @dev We hold the list of the FAST governors in there.
    LibAddressSet.Data governorSet;
    // @dev The FAST members are held in there.
    LibAddressSet.Data memberSet;
  }

  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
