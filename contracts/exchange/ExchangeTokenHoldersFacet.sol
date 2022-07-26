// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './lib/AExchangeFacet.sol';
import '../spc/SpcTopFacet.sol';
import '../interfaces/IERC20.sol';
import '../interfaces/ITokenHoldings.sol';

/** @dev The Exchange FAST balances facet.
 */
contract ExchangeTokenHoldersFacet is AExchangeFacet, ITokenHoldings {
  using LibAddressSet for LibAddressSet.Data;

  /** @dev The callback used when a balance changes on a FAST.
   */
  function holdingUpdated(address account, address fast)
    external override {
    // Verify that the given address is in fact a registered FAST contract.
    require(
      SpcTopFacet(LibExchange.data().spc).isFastRegistered(msg.sender),
      LibConstants.REQUIRES_FAST_CONTRACT_CALLER
    );

    // Get the storage pointer and balance of the token holder.
    LibExchangeTokenHolders.Data storage s = LibExchangeTokenHolders.data();
    uint256 balance = IERC20(fast).balanceOf(account);

    // If this is a positive balance and it doesn't already exist in the set, add address.
    if (balance > 0 && !s.fastHoldings[account].contains(fast)) {
      s.fastHoldings[account].add(fast, false);
    }

    // If the balance is 0 and it exists in the set, remove it.
    if (balance == 0 && s.fastHoldings[account].contains(fast)) {
      s.fastHoldings[account].remove(fast, false);
    }
  }

  /** @dev A way to get a list of FASTs for an account.
   *  @return list of FAST addresses.
   */
  function holdings(address account)
    external view override
    returns(address[] memory) {
    LibExchangeTokenHolders.Data storage s = LibExchangeTokenHolders.data();
    return s.fastHoldings[account].values;
  }
}