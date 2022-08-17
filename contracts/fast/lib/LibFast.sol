// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;


library LibFast {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Fast.storage'):
  bytes32 internal constant STORAGE_SLOT = 0x80c187ea6f955fd624c41fb7a18011cc87d98c6f4c06d897b59142f65707e705;

  // Data structures.

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    /// @dev The internal pointer to the Issuer contract.
    address issuer;
    /// @dev The internal pointer to the Marketplace contract.
    address marketplace;
    /// @dev We have to track whether the token facet provides continuous minting or fixed supply.
    bool hasFixedSupply;
    /// @dev Whether or not this FAST requires to be a member to hold tokens.
    bool isSemiPublic;
    /// @dev Whether a FAST is regulated or not.
    bool isRegulated;
    /// @dev Whether or not transfers are blocked until a governor reviews them.
    bool requiresTransferReview;
  }

  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
