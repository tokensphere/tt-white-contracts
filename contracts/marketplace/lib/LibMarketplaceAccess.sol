// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibAddressSet.sol';


library LibMarketplaceAccess {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Marketplace.storage.Access'):
  bytes32 internal constant STORAGE_SLOT = 0xecb992c7a1185ca18ac50bc1672192fb67e7c3e74465887a8fcaab265dab37bd;

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    /// @dev This is where we hold our members data.
    LibAddressSet.Data memberSet;
    /// @dev This is where we keep track of our member FAST memberships.
    mapping(address => LibAddressSet.Data) fastMemberships;
    /// @dev This is where we keep track of our deactivated memberships.
    LibAddressSet.Data deactivatedMemberSet;
  }

  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
