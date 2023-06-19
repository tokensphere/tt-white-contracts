// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../lib/LibAddressSet.sol";

library LibIssuer {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Issuer.storage'):
  bytes32 internal constant STORAGE_SLOT = 0xd681d5f1de7bc4b7442c088939dc202585e09699e92a94c9717ace8d0f4fcaa5;

  // Data structures.

  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    // This is where we keep our list of deployed fast FASTs.
    LibAddressSet.Data fastSet;
    // We keep track of the FAST symbols that were already used - string to FAST address.
    mapping(string => address) fastSymbols;
    // We also keep track of the FAST groups here - slug to FAST address set.
    mapping(string => LibAddressSet.Data) fastGroups;
  }

  function data() internal pure returns (Data storage s) {
    assembly {
      s.slot := STORAGE_SLOT
    }
  }
}
