// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../lib/LibAddressSet.sol';


library LibFastAutomatons {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Fast.storage.Automatons'):
  bytes32 internal constant STORAGE_SLOT = 0xc40d5c7e936c6e810afbdc90336d014a00cba2ec97796ebc91c7cafa2a5827f8;

  uint256 constant PRIVILEGE_ADD_MEMBER = 1;
  uint256 constant PRIVILEGE_REMOVE_MEMBER = 2;
  uint256 constant PRIVILEGE_MANAGE_DISTRIBUTIONS = 4;

  struct Privileges {
    bool canAddMember;
    bool canRemoveMember;
    bool canManageDistributions;
  }

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
