// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../../lib/LibAddressSet.sol";

library LibRequestedFastDeployments {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Marketplace.storage.RequestedFastDeployments'):
  bytes32 internal constant STORAGE_SLOT = 0x76bf4334ce845be36ecb43e6a03f2ab49f02f279a30e4e516a514e2032d61231;

  struct Request {
    address sender;
    uint256 paid;
    string params;
  }

  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    /// @notice The price of a FAST Deployment Request.
    uint256 price;
    /// @notice This is the list of requested deployments.
    Request[] requests;
  }

  function data() internal pure returns (Data storage s) {
    assembly {
      s.slot := STORAGE_SLOT
    }
  }
}
