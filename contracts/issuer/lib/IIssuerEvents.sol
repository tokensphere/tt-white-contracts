// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


// WARNING: These events must be maintained 1:1 with LibIssuerEvents!
// They also should never be emitted directly, they only help us defining
// typescript types!
interface IIssuerEvents {
  // Fast registration events.

  /** @notice Emited when a new FAST is registered.
   * @param fast The address of the newly registered FAST diamond.
   */
  event FastRegistered(address indexed fast);

  // IHasMembers.

  event MemberAdded(address indexed member);
  event MemberRemoved(address indexed member);

  // Governors.

  event GovernorshipRemoved(address indexed fast, address indexed governor);
  event GovernorshipAdded(address indexed fast, address indexed governor);
}
