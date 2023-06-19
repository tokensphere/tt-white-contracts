// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../lib/LibAddressSet.sol";

library LibMarketplaceTokenHolders {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Marketplace.TokenHolders.storage'):
  bytes32 internal constant STORAGE_SLOT = 0xecf50453542504034bd40d376fb1408ada3025f2fe86ca1b9b4b1440b8d4a2f4;

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    /// @dev The tracked FAST holdings of a user.
    mapping(address => LibAddressSet.Data) fastHoldings;
  }

  function data() internal pure returns (Data storage s) {
    assembly {
      s.slot := STORAGE_SLOT
    }
  }
}
