// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

/// @title An interface signifying that the inheriting contract implements the concept of active memberships.
interface IHasActiveMembers {
  /**
   * @notice Queries whether a given account is a member of the marketplace and flagged as active.
   * @param member is the address to query.
   * @return A `bool` set to `true` if the candidate is an active member.
   */
  function isActiveMember(address member) external view returns (bool);

  /**
   * @notice Deactivates a given member address.
   * @param member is the address to deactivate.
   */
  function deactivateMember(address member) external;

  /**
   * @notice Activates a given member address.
   * @param member is the address to activate.
   */
  function activateMember(address member) external;
}
