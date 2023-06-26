// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../lib/LibAddressSet.sol";

library LibFastCrowdfunds {
  /// @notice The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 2;
  /// @notice This is keccak256('Fast.storage.Crowdfunds'):
  bytes32 internal constant STORAGE_SLOT = 0xc843fbb8f0f5694376d391c1687b800112a6eed97820d8e7a2b82618dd1b69ed;

  /**
   * @notice The access data structure required for operating any given FAST diamond.
   * @dev The `version` field is used to ensure that storage is at a known version during upgrades.
   */
  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    /// @notice Every deployed crowdfund contract is held here.
    LibAddressSet.Data crowdfundSet;
    /// @notice The default crowdfund fee for this FAST.
    uint32 crowdfundsDefaultBasisPointsFee;
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
