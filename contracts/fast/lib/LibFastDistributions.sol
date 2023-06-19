// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../lib/LibAddressSet.sol";

library LibFastDistributions {
  /// @notice The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  /// @notice This is keccak256('Fast.storage.Distributions'):
  bytes32 internal constant STORAGE_SLOT = 0xe865e85b076245a187a9d3cc15c47264cd0b46df4afd899817bd2e16523485ad;

  /**
   * @notice The access data structure required for operating any given FAST diamond.
   * @dev The `version` field is used to ensure that storage is at a known version during upgrades.
   */
  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    /// @notice Every deployed distribution contract is held here.
    LibAddressSet.Data distributionSet;
  }

  /**
   * @notice Returns the access storage for the calling FAST.
   * @return s a struct pointer for access FAST data storage.
   */
  function data() internal pure returns (Data storage s) {
    assembly {
      s.slot := STORAGE_SLOT
    }
  }
}
