// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


interface IFast {
  function isSemiPublic() external view returns(bool);
  function hasFixedSupply() external view returns(bool);
}
