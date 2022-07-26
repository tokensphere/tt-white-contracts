// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/**
 * @dev Interface to wrap FAST holdings functionality.
 */
interface ITokenHoldings {
  /**
   * @dev Callback for a FAST token.
   * @param account The account to add the FAST address to.
   * @param fast The address of the FAST.
   */
  function holdingUpdated(address account, address fast) external;

  /**
   * @dev Returns the FASTs an account holds.
   * @param account The account to query the FAST holdings of.
   */
  function holdings(address account) external view returns(address[] memory);
}
