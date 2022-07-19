// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


// WARNING: These events must be maintained 1:1 with LibSpcEvents!
// They also should never be emitted directly, they only help us defining
// typescript types!
interface ISpcEvents {
  // ETH provisioning events.

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

  // Fast registration events.

  /** @dev Emited when a new FAST is registered.
   *  @param fast The address of the newly registered FAST diamond.
   */
  event FastRegistered(address indexed fast);

  // IHasMembers.

  event MemberAdded(address indexed member);
  event MemberRemoved(address indexed member);
}
