// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibAddressSet.sol';


library LibMarketplaceTokenHolders {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('ExchangeTokenHolders.storage'):
  bytes32 internal constant STORAGE_SLOT = 0xae3f81e6561b0a186d5e2c7e6688ebe85f414da57650ce54e5553211cc0c627a;

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    /// @dev The tracked FAST holdings of a user.
    mapping(address => LibAddressSet.Data) fastHoldings;
  }

  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
