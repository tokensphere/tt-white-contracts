// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IMarketplaceEvents {
  /// @dev See `IHasActiveMembers`.
  event MemberActivated(address indexed member);
  /// @dev See `IHasActiveMembers`.
  event MemberDeactivated(address indexed member);
}
