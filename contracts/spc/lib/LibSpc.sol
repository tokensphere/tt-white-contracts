// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibAddressSet.sol';


library LibSpc {
  // These are from IHasMembers.
  event MemberAdded(address indexed member);

  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Spc.storage'):
  bytes32 internal constant STORAGE_SLOT = 0x89a652f66ca129ef71cab44916bb070742a08af428e08a99df145c8006c94285;

  // Events.

  /** @dev Emited when a new FAST is registered.
   *  @param fast The address of the newly registered FAST diamond.
   */
  event FastRegistered(address indexed fast);

  /** @dev Emited when someone provisions this SPC with Eth.
   *  @param from The sender of the Eth.
   *  @param amount The quantity of Eth, expressed in Wei.
   */
  event EthReceived(address indexed from, uint256 amount);
  /** @dev Emited when Eth is drained from this SPC.
   *  @param to The caller and recipient of the drained Eth.
   *  @param amount The quantity of Eth that was drained, expressed in Wei.
   */
  event EthDrained(address indexed to, uint256 amount);

  // Data structures.

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    // This is where we keep our list of deployed fast FASTs.
    LibAddressSet.Data fastSet;
    // We keep track of the FAST symbols that were already used.
    mapping(string => address) fastSymbols;
  }

  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
