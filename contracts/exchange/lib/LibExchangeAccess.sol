// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibAddressSet.sol';


library LibExchangeAccess {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Exchange.storage.Access'):
  bytes32 internal constant STORAGE_SLOT = 0x238f5ead2481aef1ec60acdfe5b3de34c076d0a86bb41e30c913f5f3885d7c47;

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    /// @dev This is where we hold our members data.
    LibAddressSet.Data memberSet;
    /// @dev This is where we keep track of our member FAST memberships.
    mapping(address => LibAddressSet.Data) fastMemberships;
    /// @dev This is where we keep track of our deactivated memberships.
    LibAddressSet.Data deactivatedMemberSet;
  }

  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
