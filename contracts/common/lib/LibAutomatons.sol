// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../lib/LibAddressSet.sol';


library LibAutomatons {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Automatons.storage'):
  bytes32 internal constant STORAGE_SLOT = 0x72e61414f0d129b9bbb7bdca6bd66869caef273bde181c005dc191fc7c503714;

  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    /// @notice This is where we hold our automatons data.
    LibAddressSet.Data automatonSet;
    /// @notice This is where we store privileges for each of our automaton account.
    mapping(address => uint256) automatonPrivileges;
  }

  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
