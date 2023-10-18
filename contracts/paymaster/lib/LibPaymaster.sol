// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

library LibPaymaster {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Paymaster.storage'):
  bytes32 internal constant STORAGE_SLOT = 0x8f0e66ee30211ca069424cd4b533ee66f04c45421216c1a6601cf23359c1f7f8;

  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    /// @notice The internal pointer to the Marketplace contract.
    address marketplace;
  }

  function data() internal pure returns (Data storage s) {
    assembly {
      s.slot := STORAGE_SLOT
    }
  }
}
