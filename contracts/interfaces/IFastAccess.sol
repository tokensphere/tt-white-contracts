// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import './ISpc.sol';
import './IHasMembers.sol';
import './IHasGovernors.sol';

/**
 * @dev Interface of the FAST Access standard.
 */
interface IFastAccess is IHasMembers, IHasGovernors {
  /**
   * @dev This structure isn't used anywhere in storage. Instead, it
   * allows various methods of the contract to return all the flags
   * associated with a given address in one go.
   */
  struct Flags {
    bool isGovernor;
    bool isMember;
  }
}
