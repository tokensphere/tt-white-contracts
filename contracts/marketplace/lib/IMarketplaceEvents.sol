// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IMarketplaceEvents {
  /// @dev See `IHasActiveMembers`.
  event MemberActivated(address indexed member);
  /// @dev See `IHasActiveMembers`.
  event MemberDeactivated(address indexed member);
  /// @dev Emitted when a FAST deployment is requested.
  event FastDeploymentRequested(uint256 index);
}
