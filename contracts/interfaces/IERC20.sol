// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

/// @title ERC20 standard as defined in the EIP.
interface IERC20 {
  /**
   * @notice Allows to query the total number of tokens in circulation.
   * @return An `uint256` representing how many tokens are currently in circulation.
   */
  function totalSupply() external view returns (uint256);

  /**
   * @notice Allows to query the balance of a given address.
   * @param account is the address for which the balance shall be queried.
   * @return An `uint256` - the balance for the given address.
   */
  function balanceOf(address account) external view returns (uint256);

  /**
   * @notice Moves `amount` tokens from the caller's account to `recipient`.
   * @param recipient is the address to which the funds should be sent to, if successful.
   * @param amount is the amount of tokens to transfef.
   * @return A `bool` which value is `true` when the operation was successful.
   */
  function transfer(address recipient, uint256 amount) external returns (bool);

  /**
   * @notice Returns the remaining number of tokens that `spender` will be allowed to spend on behalf of `owner`
   * through `transferFrom`. This is zero by default.
   * @dev This value changes when `approve`, `disapprove` and `transferFrom` / `transferFromWithRef` are called.
   * @param owner is the owner of the funds.
   * @param spender is the address for which the allowance should be queried.
   * @return A `uint256` representing the remaining allowance of `spender` over `owner`'s funds.
   */
  function allowance(address owner, address spender) external view returns (uint256);

  /**
   * @notice Increases the allowance of `spender` by `amount`.
   * @param spender is the address towards which the allowance should be given.
   * @return A `bool` set to `true` when the operation was successful.
   */
  function approve(address spender, uint256 amount) external returns (bool);

  /**
   * @notice Attempts to transfer `amount` tokens from `sender` to `recipient` using the
   * allowance mechanism. `amount` is then deducted from the caller's allowance.
   * @return A `bool` set to `true` when the operation was successful.
   */
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}
