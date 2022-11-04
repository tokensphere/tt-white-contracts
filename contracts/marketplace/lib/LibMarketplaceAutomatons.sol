// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../lib/LibAddressSet.sol';


library LibMarketplaceAutomatons {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Marketplace.storage.Automatons'):
  bytes32 internal constant STORAGE_SLOT = 0x3e5f2d0a4b37e30e18cfb9f02b5d58c14e633cc6134b80816aaa63374222d845;

  uint256 constant PRIVILEGE_ADD_MEMBER = 1;
  uint256 constant PRIVILEGE_REMOVE_MEMBER = 2;
  uint256 constant PRIVILEGE_ACTIVATE_MEMBER = 4;
  uint256 constant PRIVILEGE_DEACTIVATE_MEMBER = 8;

  struct Privileges {
    bool canAddMember;
    bool canRemoveMember;
    bool canActivateMember;
    bool canDeactivateMember;
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
