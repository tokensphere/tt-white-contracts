// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../lib/LibAddressSet.sol';
import './lib/AFastFacet.sol';
import './lib/LibFastToken.sol';
import './FastHistoryFacet.sol';
import '../interfaces/IERC20.sol';


contract FastTokenInternalFacet is AFastFacet {
  using LibAddressSet for LibAddressSet.Data;

  // Public (internal to this diamond) functions.

  function _transfer(address spender, address from, address to, uint256 amount, string memory ref)
      external
      diamondInternal
      canHoldTokens(from) canHoldTokens(to) differentAddresses(from, to) returns(bool) {
    LibFastToken.Data storage s = LibFastToken.data();

    // Make sure that there's enough funds.
    require(s.balances[from] >= amount, LibConstants.INSUFFICIENT_FUNDS);
    // Make sure that the FAST has enough transfer credits.
    if (from != address(0)) {
      require(s.transferCredits >= amount, LibConstants.INSUFFICIENT_TRANSFER_CREDITS);
    }

    // Keep track of the balances - `from` spends, `to` receives.
    s.balances[from] -= amount;
    s.balances[to] += amount;

    // If the funds are going to the ZERO address, decrease total supply.
    if (to == address(0)) {
      s.totalSupply -= amount;
    }
    // If the funds are moving from the zero address, increase total supply.
    else if (from == address(0)) {
      s.totalSupply += amount;
    }

    // Keep track of the transfer in the history facet.
    FastHistoryFacet(address(this)).transfered(spender, from, to, amount, ref);

    // Emit!
    emit LibFastToken.Transfer(from, to, amount);
    return true;
  }

  function _approve(address from, address spender, uint256 amount)
      external
      diamondInternal
      membership(msg.sender) returns(bool) {
    LibFastToken.Data storage s = LibFastToken.data();

    // Store allowance...
    s.allowances[from][spender] += amount;
    // Keep track of given and received allowances.
    s.allowancesByOwner[from].add(spender, true);
    s.allowancesBySpender[spender].add(from, true);

    // Emit!
    emit LibFastToken.Approval(from, spender, amount);
    return true;
  }

  function _disapprove(address from, address spender)
      external
      diamondInternal {
    LibFastToken.Data storage s = LibFastToken.data();

    // Remove allowance.
    s.allowances[from][spender] = 0;
    s.allowancesByOwner[from].remove(spender, false);
    s.allowancesBySpender[spender].remove(from, false);

    // Emit!
    emit LibFastToken.Disapproval(from, spender);
  }

  // Modifiers.

  modifier differentAddresses(address a, address b) {
    require(a != b, LibConstants.REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT);
    _;
  }
}
