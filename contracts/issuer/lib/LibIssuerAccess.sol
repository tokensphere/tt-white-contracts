// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import '../../lib/LibAddressSet.sol';


library LibIssuerAccess {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Issuer.storage.Access'):
  bytes32 internal constant STORAGE_SLOT = 0x3ceaa4d5edf9c96fbd56140abe6389d65a87143d4f11819874ff2fe0ae9574db;

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    // This is where we hold our members data.
    LibAddressSet.Data memberSet;
    // For a given address we store list of FASTs where that address is a governor.
    mapping(address => LibAddressSet.Data) fastGovernorships;
  }

  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
