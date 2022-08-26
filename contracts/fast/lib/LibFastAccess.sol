// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../lib/LibAddressSet.sol';

/**
 * @notice This library centralises shared functionality between FAST diamonds facets that have to do with ACLs.
 * @dev Note that if you feel like a method should be created inside this library, you might want to really consider
 * whether or not it is the right place for it. Any facet using a method from internal libraries see their bytecode
 * size increase, kind of defeating the benefits of using facets in the first place. So please keep it reasonable. 
 */
library LibFastAccess {
  /// @notice The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  /// @notice This is keccak256('Fast.storage.Access'):
  bytes32 internal constant STORAGE_SLOT = 0x87ed8063ac9ead3b2eb7551ed3d89b29fcbf44d6733084b5c82e95d5120ece9a;

  /**
   * @notice The access data structure required for operating any given FAST diamond.
   * @dev The `version` field is used to ensure that storage is at a known version during upgrades.
   */
  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    /// @notice We hold the list of the FAST governors in there.
    LibAddressSet.Data governorSet;
    /// @notice The FAST members are held in there.
    LibAddressSet.Data memberSet;
  }

  /**
   * @notice Returns the access storage for the calling FAST.
   * @return s a struct pointer for access FAST data storage.
   */
  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
