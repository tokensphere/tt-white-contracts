// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

/**
 * @notice Top-level shared functionality for FAST diamonds.
 * @dev Note that if you feel like a method should be created inside this library, you might want to really consider
 * whether or not it is the right place for it. Any facet using a method from internal libraries see their bytecode
 * size increase, kind of defeating the benefits of using facets in the first place. So please keep it reasonable.
 */
library LibFast {
  /// @notice The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  /// @notice This is keccak256('Fast.storage'):
  bytes32 internal constant STORAGE_SLOT = 0x80c187ea6f955fd624c41fb7a18011cc87d98c6f4c06d897b59142f65707e705;

  // Data structures.

  /**
   * @notice The top-level data structure required for operating any given FAST diamond.
   * @dev The `version` field is used to ensure that storage is at a known version during upgrades.
   */
  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    /// @notice The internal pointer to the Issuer contract.
    address issuer;
    /// @notice The internal pointer to the Marketplace contract.
    address marketplace;
    /// @notice We have to track whether the token facet provides continuous minting or fixed supply.
    bool hasFixedSupply;
    /// @notice Whether or not this FAST requires to be a member to hold tokens.
    bool isSemiPublic;
    /// @notice A flag which when toggled to `true` disables all transfers across this FAST.
    bool transfersDisabled;
    /// @notice To which FAST group this FAST belongs to, if any.
    string group;
  }

  /**
   * @notice Returns the top-level storage for the calling FAST.
   * @return s a struct pointer for top-level FAST data storage.
   */
  function data() internal pure returns (Data storage s) {
    assembly {
      s.slot := STORAGE_SLOT
    }
  }
}
