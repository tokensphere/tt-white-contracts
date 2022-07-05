// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


library LibFast {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Fast.storage'):
  bytes32 internal constant STORAGE_SLOT = 0x80c187ea6f955fd624c41fb7a18011cc87d98c6f4c06d897b59142f65707e705;

  // Data structures.

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    /// @dev The internal pointer to the SPC contract.
    address spc;
    /// @dev The internal pointer to the Exchange contract.
    address exchange;
  }

  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
