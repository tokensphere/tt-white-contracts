// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import '../../lib/LibAddressSet.sol';


library LibMarketplace {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Marketplace.storage'):
  bytes32 internal constant STORAGE_SLOT = 0xb59ec141376cee83f618e10e881bbb4789cdeee27e0d441a8c37ead3cb8b93c1;

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    /// @dev The internal pointer to the Issuer contract.
    address issuer;
  }

  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
