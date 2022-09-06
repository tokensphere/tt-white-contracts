// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IStorageMigrateable {
  /** @notice Handles facet migrations.
   * @return bool Whether the migration was successful or not.
   */
  function migrate() external returns(bool);
}
