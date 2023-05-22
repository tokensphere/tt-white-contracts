// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


// WARNING: These events must be maintained 1:1 with LibIssuerEvents!
// They also should never be emitted directly, they only help us defining
// typescript types!
interface IIssuerEvents {
  /// FAST registration events.

  /**
   * @notice Emited when a new FAST is registered.
   * @param fast The address of the newly registered FAST diamond.
   */
  event FastRegistered(address indexed fast);
  /**
   * @notice Emited when a FAST is removed from the Issuer contract.
   * @param fast The address of the unregistered FAST.
   */
  event FastUnregistered(address indexed fast);

  /// FAST groupping events.

  event FastGroupChanged(address indexed fast, string indexed oldGroup, string indexed newGroup);

  /// Governors.

  event GovernorshipRemoved(address indexed fast, address indexed governor);
  event GovernorshipAdded(address indexed fast, address indexed governor);
}
