// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../lib/LibAddressSet.sol';
import './lib/AFastFacet.sol';
import './lib/LibFastToken.sol';
import './FastTokenFacet.sol';
import './FastHistoryFacet.sol';
import '../interfaces/IERC20.sol';


contract FastTokenInternalFacet is AFastFacet {
  using LibAddressSet for LibAddressSet.Data;

  // ERC20 and Token related events.
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
  event Disapproval(address indexed owner, address indexed spender);

  // Public (internal to this diamond) functions.

  struct TransferArgs {
    address spender;
    address from;
    address to;
    uint256 amount;
    string ref;
  }

  function performTransfer(TransferArgs calldata p)
      external diamondInternal
      canHoldTokens(p.from) canHoldTokens(p.to) differentAddresses(p.from, p.to) {
    LibFastToken.Data storage s = LibFastToken.data();

    // Make sure that there's enough funds.
    require(
      s.balances[p.from] >= p.amount,
      LibConstants.INSUFFICIENT_FUNDS
    );

    // If this is an allowance transfer...
    if (p.spender != p.from) {
      // Make sure that the spender has enough allowance.
      require(
        FastTokenFacet(address(this)).allowance(p.from, p.spender) >= p.amount,
        LibConstants.INSUFFICIENT_ALLOWANCE
      );

      // If the from account isn't the zero address...
      if (p.from != address(0)) {
        // Make sure enough credits exist.
        require(
          s.transferCredits >= p.amount,
          LibConstants.INSUFFICIENT_TRANSFER_CREDITS
        );

        // Decrease allowance.
        uint256 newAllowance = s.allowances[p.from][p.spender] -= p.amount;
        // If the allowance reached zero, we want to remove that allowance from
        // the various other places where we keep track of it.
        if (newAllowance == 0) {
          s.allowancesByOwner[p.from].remove(p.spender, true);
          s.allowancesBySpender[p.spender].remove(p.from, true);
        }
      }
    }

    // Keep track of the balances - `from` spends, `to` receives.
    s.balances[p.from] -= p.amount;
    s.balances[p.to] += p.amount;

    // If the funds are going to the ZERO address, decrease total supply.
    if (p.to == address(0)) {
      s.totalSupply -= p.amount;
    }
    // If the funds are moving from the zero address, increase total supply.
    else if (p.from == address(0)) {
      s.totalSupply += p.amount;
    }

    // Keep track of the transfer in the history facet.
    FastHistoryFacet(address(this)).transfered(p.spender, p.from, p.to, p.amount, p.ref);

    // Emit!
    emit Transfer(p.from, p.to, p.amount);
  }

  function performApproval(address from, address spender, uint256 amount)
      external
      diamondInternal
      membership(from) {
    LibFastToken.Data storage s = LibFastToken.data();

    // Store allowance...
    s.allowances[from][spender] += amount;
    // Keep track of given and received allowances.
    s.allowancesByOwner[from].add(spender, true);
    s.allowancesBySpender[spender].add(from, true);

    // Emit!
    emit Approval(from, spender, amount);
  }

  function performDisapproval(address from, address spender)
      external
      diamondInternal {
    LibFastToken.Data storage s = LibFastToken.data();

    // Remove allowance.
    s.allowances[from][spender] = 0;
    s.allowancesByOwner[from].remove(spender, false);
    s.allowancesBySpender[spender].remove(from, false);

    // Emit!
    emit Disapproval(from, spender);
  }

  // Modifiers.

  modifier differentAddresses(address a, address b) {
    require(a != b, LibConstants.REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT);
    _;
  }
}
