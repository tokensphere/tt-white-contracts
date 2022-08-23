// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


/** @notice The top-level all FAST diamonds must comply to.
 */
interface IFast {
  /** @notice Queries whether the FAST is semi-public or closed.
   * @return a `bool` being `true` if the FAST is semi-public.
   */
  function isSemiPublic() external view returns(bool);

  /** @notice Queries whether the FAST has fixed or continuous supply.
   * @return a `bool` being `true` if the FAST has fixed supply.
   */
  function hasFixedSupply() external view returns(bool);
}
