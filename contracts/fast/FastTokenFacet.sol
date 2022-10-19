// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../interfaces/IERC20.sol';
import '../interfaces/ICustomErrors.sol';
import '../interfaces/IHasMembers.sol';
import '../interfaces/IHasGovernors.sol';
import '../lib/LibDiamond.sol';
import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import './lib/AFastFacet.sol';
import './lib/LibFastToken.sol';
import './lib/IFast.sol';
import '../marketplace/MarketplaceTokenHoldersFacet.sol';
import './FastTopFacet.sol';
import './FastAccessFacet.sol';
import './FastHistoryFacet.sol';
import './FastFrontendFacet.sol';


contract FastTokenFacet is AFastFacet, IERC20 {
  using LibAddressSet for LibAddressSet.Data;

  // Minting methods.

  /**
   * @notice Mints an amount of FAST tokens.
   *  A reference can be passed to identify why this happened for example.
   *
   * Business logic:
   * - Modifiers:
   *   - Requires the caller to be a member of the Issuer contract.
   * - Requires that either the token has continuous supply, or that no tokens have been minted yet.
   * - Increases the reserve balance by `amount`.
   * - Calls `FastHistoryFacet.minted`.
   * - Calls `FastFrontendFacet.emitDetailsChanged`.
   * - Emits a `Minted(amount, ref)` event.
   * @param amount The number of FAST tokens to mint.
   * @param ref A reference for this minting operation.
   */
  function mint(uint256 amount, string calldata ref)
      external
      onlyIssuerMember {
    LibFastToken.Data storage s = LibFastToken.data();
    // We want to make sure that either of these two is true:
    // - The token doesn't have fixed supply.
    // - The token has fixed supply but has no tokens yet (First and only mint).
    if (FastTopFacet(address(this)).hasFixedSupply() && (s.totalSupply != 0 || this.balanceOf(address(0)) != 0))
      revert ICustomErrors.RequiresContinuousSupply();

    // Prepare the minted amount on the zero address.
    s.balances[address(0)] += amount;

    // Keep track of the minting operation.
    FastHistoryFacet(address(this)).minted(amount, ref);

    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
    emit Minted(amount, ref);
  }

  /**
   * @notice Burns an amount of FAST tokens.
   *  A reference can be passed to identify why this happened for example.
   *
   * Business logic.
   * - Modifiers:
   *   - Requires the caller to be a member of the Issuer contract.
   * - Requires that the token has continuous supply.
   * - Requires that there are enough funds in the reserve to cover for `amount` being burnt.
   * - Decreases the reserve balance by `amount`.
   * - Calls `FastHistoryFacet.burnt(amount, ref)`.
   * - Calls `FastFrontendFacet.emitDetailsChanged`.
   * - Emits a `Burnt(amount, ref)`.
   * @param amount The number of FAST tokens to mint.
   * @param ref A reference for this minting operation.
   */
  function burn(uint256 amount, string calldata ref)
      external
      onlyIssuerMember {
    LibFastToken.Data storage s = LibFastToken.data();

    if (FastTopFacet(address(this)).hasFixedSupply())
      revert ICustomErrors.RequiresContinuousSupply();

    // Remove the minted amount from the zero address.
    s.balances[address(0)] -= amount;

    // Keep track of the minting operation.
    FastHistoryFacet(address(this)).burnt(amount, ref);

    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
    emit Burnt(amount, ref);
  }

  /**
   * @notice Allows an Issuer member to move an arbitrary account's holdings back to the reserve,
   * as per regulatory requirements.
   *
   * Business logic:
   * - Modifiers:
   *   - Requires that the caller is a member of the Issuer contract.
   * - If the amount held by `holder` is not zero
   *   - The balance of `holder` should be set to zero.
   *   - The reserve's balance should be increased by how much was on the holder's account.
   *   - Total supply should be decreased by that amount too.
   * - The `holder`'s address should not be tracked as a token holder in this FAST anymore.
   * - The `holder`'s address should not be tracked as a token holder in the Marketplace anymore.
   * - A `Transfer(holder, reserve, amount)` event should be emited.
   * - If the amount previously held by `holder` was not zero,
   *   - Since the reserve balance and total supply have changed, the `FastFrontendFacet.emitDetailsChanged()` function should be called.
   * @param holder is the address for which to move the tokens from.
   */
  function retrieveDeadTokens(address holder)
      external
      onlyIssuerMember {
    // Cache how many tokens the holder has.
    uint256 amount = balanceOf(holder);
    // Note: The amount **can** be zero in this function.

    // Grab a pointer to the token storage.
    LibFastToken.Data storage s = LibFastToken.data();

    // These should only run if the amount is zero, as they result in a no-op.
    if (amount > 0) {
      // Set the holder balance to zero.
      s.balances[holder] = 0;
      // Increment the reserve's balance.
      s.balances[address(0)] += amount;
      // The tokens aren't in circulation anymore - decrease total supply.
      s.totalSupply -= amount;
    }

    // Since the holder's account is now empty, make sure to keep track of it both
    // in this FAST and in the marketplace.
    s.tokenHolders.remove(holder, true);
    MarketplaceTokenHoldersFacet(LibFast.data().marketplace).fastBalanceChanged(holder, 0);

    // This operation can be seen as a regular transfer between holder and reserve. Emit.
    emit Transfer(holder, address(0), amount);

    // If amount wasn't zero, total supply and reserve balance have changed - emit.
    if (amount > 0)
      FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  // ERC20 implementation and transfer related methods.

  /**
   * @notice The name of this FAST (ERC20 standard).
   * @return string Name of the FAST.
   */
  function name()
      external view returns(string memory) {
    return LibFastToken.data().name;
  }

  /**
   * @notice The symbol of this FAST (ERC20 standard).
   * @return string Symbol of the FAST.
   */
  function symbol()
      external view returns(string memory) {
    return LibFastToken.data().symbol;
  }

  /**
   * @notice The `decimals` of this FAST (ERC20 standard).
   * @return uint256 Number of decimals the FAST has.
   */
  function decimals()
      external view returns(uint256) {
    return LibFastToken.data().decimals;
  }

  /**
   * @notice The total supply of the FAST (ERC20 standard).
   * @return uint256 Total supply of the FAST.
   */
  function totalSupply()
      external override view returns(uint256) {
    return LibFastToken.data().totalSupply;
  }

  /**
   * @notice The balance of the passed owner (ERC20 standard).
   * @param owner The owners address to get the balance of.
   * @return uint256 The current balance of this owner's account.
   */
  function balanceOf(address owner)
      public view override returns(uint256) {
    return LibFastToken.data().balances[owner];
  }

  /**
   * @notice See `performTransfer`, the spender will be equal to the `owner`, and the `ref` will be defauted. */
  function transfer(address to, uint256 amount)
      external override returns(bool) {
    // Make sure the call is performed externally so that we can mock.
    this.performTransfer(
      TransferArgs({
        spender: msg.sender,
        from: msg.sender,
        to: to,
        amount: amount,
        ref: LibFastToken.DEFAULT_TRANSFER_REFERENCE
      })
    );
    return true;
  }

  /**
   * @notice See `performTransfer`, the spender will be equal to the `owner`. */
  function transferWithRef(address to, uint256 amount, string calldata ref)
      external returns(bool) {
    // Make sure the call is performed externally so that we can mock.
    this.performTransfer(
      TransferArgs({
        spender: msg.sender,
        from: msg.sender,
        to: to,
        amount: amount,
        ref: ref
      })
    );
    return true;
  }

  function allowance(address owner, address spender)
      public view override returns(uint256) {
    LibFastToken.Data storage s = LibFastToken.data();
    // If the allowance being queried is owned by the reserve, and `spender` is
    // an Issuer member, `spender` owns the full balance of `owner`. If they are
    // not an Issuer member then their allowance is zero. Otherwise, the regular given
    // allowance for `spender` over `owner` applies.
    if (owner == address(0))
      return IHasMembers(LibFast.data().issuer).isMember(spender)
        ? s.balances[owner]
        : 0;
    else
      return s.allowances[owner][spender];
  }

  /**
   * @notice This method directly calls `performApproval`, setting its `from` paramter to the sender of
   * the transaction.
   * @param spender is the address to allow spending from the caller's wallet.
   * @param amount is how much to **increase** the allowance.
   */
  function approve(address spender, uint256 amount)
      external override returns(bool) {
    // Make sure the call is performed externally so that we can mock.
    this.performApproval(msg.sender, spender, amount);
    return true;
  }

  /**
   * @notice This method directly calls `performDisapproval`, setting its `from` parameter to the sender of
   * the transaction.
   * @param spender is the address to disallow spending from the caller's wallet.
   * @param amount is how much to **decrease** the allowance.
   */
  function disapprove(address spender, uint256 amount)
      external
      onlyMember(msg.sender)
      returns(bool) {
    // Make sure the call is performed externally so that we can mock.
    this.performDisapproval(msg.sender, spender, amount);
    return true;
  }

  /// @notice See `performTransfer`, the `ref` will be defaulted.
  function transferFrom(address from, address to, uint256 amount)
      external override returns(bool) {
    transferFromWithRef(from, to, amount, LibFastToken.DEFAULT_TRANSFER_REFERENCE);
    return true;
  }

  /// @notice See `performTransfer`.
  function transferFromWithRef(address from, address to, uint256 amount, string memory ref)
      public returns(bool) {
    // Make sure the call is performed externally so that we can mock.
    this.performTransfer(
      TransferArgs({
        spender: msg.sender,
        from: from,
        to: to,
        amount: amount,
        ref: ref
      })
    );
    return true;
  }

  // Allowances query operations.

  function givenAllowanceCount(address owner)
      external view returns(uint256) {
    return LibFastToken.data().allowancesByOwner[owner].values.length;
  }

  function paginateAllowancesByOwner(address owner, uint256 index, uint256 perPage)
      external view returns(address[] memory, uint256) {
    return LibPaginate.addresses(
      LibFastToken.data().allowancesByOwner[owner].values,
      index,
      perPage
    );
  }

  function receivedAllowanceCount(address spender)
      external view returns(uint256) {
    return LibFastToken.data().allowancesBySpender[spender].values.length;
  }

  function paginateAllowancesBySpender(address spender, uint256 index, uint256 perPage)
      external view returns(address[] memory, uint256) {
    return LibPaginate.addresses(
      LibFastToken.data().allowancesBySpender[spender].values,
      index,
      perPage
    );
  }

  // These functions would be internal / private if we weren't using the diamond pattern.
  // Instead, they're `onlyDiamondFacet` - eg can only be called by facets of the current
  // FAST.

  struct TransferArgs {
    address spender;
    address from;
    address to;
    uint256 amount;
    string ref;
  }

  /**
   * @notice This is the internal method that gets called whenever a transfer is initiated. Both `transfer`,
   * `transferWithRef`, and their variants internally call this function.
   *
   * Business logic:
   * - Modifiers:
   *   - Only facets of the current diamond should be able to call this.
   * - Requires that transfers are enabled for this FAST.
   * - Requires that `from` and `to` are different addresses.
   * - Requires that `from` membership is active in the marketplace.
   * - If `from` is not the reserve, requires that `from` is a valid token holder.
   * - If `from` is the reserve, requires that the message sender is an issuer member.
   * - Requires that `to` is a valid token holder.
   * - Requires that the amount is a positive value.
   * - If the transfer is an allowance - e.g. the `spender` is not the same as the `from` address,
   *   - The allowance given by the `from` address to the `spender` covers for the `amount`.
   *     - If we are **not** transfering **from** the reserve,
   *       - Decreases the allowance given by `from` to `spender`.
   *         - If the new allowance reaches zero,
   *           - Stop tracking the allowance in the allowance lookup tables for both spending and receiving directions.
   * - Decreases the balance of the `owner` address.
   * - Increases the balance of the `to` address by `amount`.
   * - If we are **not** transfering **from** the reserve,
   *   - Requires that there are enough transfer credits to cover for `amount`.
   *   - Decreases the transfer credits by `amount`.
   * - If the `to` address is the reserve,
   *   - Decreases the total supply by `amount`.
   *   - Calls `FastFrontendFacet.emitDetailsChanged`.
   * - Else, if the `from` address is the reserve,
   *   - Increases the total supply by `amount`.
   *   - Calls `FastFrontendFacet.emitDetailsChanged`.
   * - Calls `FastHistoryFacet.transfered`.
   * - Emits a `Transfer(from, to, amount)` event.
   */
  function performTransfer(TransferArgs calldata p)
      external onlyDiamondFacet {
    // TODO: Make this function return instead of raising errors.

    // Grab a pointer to our top-level storage.
    LibFast.Data storage topData = LibFast.data();

    // Requires that transfers are enabled for this FAST.
    if (FastTopFacet(address(this)).transfersDisabled())
      revert ICustomErrors.RequiresTransfersEnabled();
    // Requires that `from` and `to` are different addresses.
    else if (p.from == p.to)
      revert ICustomErrors.RequiresDifferentSenderAndRecipient(p.from);
    // Requires that allowance transfers from the reserve are performed by issuer members only.
    else if (p.from == address(0) && !IHasMembers(topData.issuer).isMember(p.spender))
      revert ICustomErrors.RequiresIssuerMembership(p.spender);

    // Requires that the `from` address can hold tokens.
    else if (!canHoldTokens(p.from))
      revert ICustomErrors.RequiresValidTokenHolder(p.from);
    // Requires that the `from` address marketplace membership is active if not the reserve.
    else if (p.from != address(0) && !IHasActiveMembers(LibFast.data().marketplace).isActiveMember(p.from))
      revert ICustomErrors.RequiresMarketplaceActiveMembership(p.from);

    // Requires that the `to` address can hold tokens.
    else if (!canHoldTokens(p.to))
      revert ICustomErrors.RequiresValidTokenHolder(p.to);

    // For any non-zero amount, update balances and allowances, notify other contracts, etc.
    if (p.amount != 0) {
      // Grab a pointer to our token storage.
      LibFastToken.Data storage tokenData = LibFastToken.data();

      // If this is an allowance transfer and if the `from` account is not the reserve...
      if (p.spender != p.from && p.from != address(0)) {
        // Decrease allowance.
        uint256 newAllowance = tokenData.allowances[p.from][p.spender] -= p.amount;
        // If the allowance reached zero, we want to remove that allowance from
        // the various other places where we keep track of it.
        if (newAllowance == 0) {
          tokenData.allowancesByOwner[p.from].remove(p.spender, true);
          tokenData.allowancesBySpender[p.spender].remove(p.from, true);
        }
      }

      // Keep track of the balances - `from` spends (decrease), `to` receives (increase).
      uint256 fromBalance = (tokenData.balances[p.from] -= p.amount);
      uint256 toBalance = (tokenData.balances[p.to] += p.amount);

      // Keep track of who has what FAST.
      MarketplaceTokenHoldersFacet(topData.marketplace).fastBalanceChanged(p.from, fromBalance);
      MarketplaceTokenHoldersFacet(topData.marketplace).fastBalanceChanged(p.to, toBalance);

      // Keep track of who holds this token.
      balanceChanged(p.from, fromBalance);
      balanceChanged(p.to, toBalance);

      // If the funds are going to the reserve...
      if (p.to == address(0)) {
        // Decrease total supply.
        tokenData.totalSupply -= p.amount;
        // Emit a top-level details change event.
        FastFrontendFacet(address(this)).emitDetailsChanged();
      }
      // If the funds are moving from the zero address...
      else if (p.from == address(0)) {
        // Increase total supply.
        tokenData.totalSupply += p.amount;
        // Emit a top-level details change event.
        FastFrontendFacet(address(this)).emitDetailsChanged();
      }
    }

    // Keep track of the transfer in the history facet.
    FastHistoryFacet(address(this)).transfered(p.spender, p.from, p.to, p.amount, p.ref);

    // Emit!
    emit Transfer(p.from, p.to, p.amount);
  }

  /**
   * @notice Increases the allowance given by `from` to `spender` by `amount`.
   * Note that this function should run and emit even if the amount passed is zero.
   * Business logic:
   * - Modifiers:
   *   - Only facets of the current diamond should be able to call this.
   *   - Requires that `onlyTokenHolder` passes for the `from` address.
   * - Requires that the `amount` is positive number.
   * - Increases the allowance given by `from` to `spender` by `amount`.
   * - Update the allowance lookup tables in both directions.
   * - Emits an `Approval(from, spender, amount)`.
   * @param from is the wallet from which to give the allowance.
   * @param spender is the receiver of the allowance.
   * @param amount is how much to **increase** the current allowance by.
   * 
   * Note: This function runs when amount is zero, and will emit.
   */
  function performApproval(address from, address spender, uint256 amount)
      external
      onlyDiamondFacet {
    // Allowance cannot be given over the reserve.
    if (from == address(0))
      revert ICustomErrors.UnsupportedOperation();
    // Require that the `from` address can hold tokens.
    else if (!canHoldTokens(from))
      revert ICustomErrors.RequiresValidTokenHolder(from);
    
    if (amount > 0) {
      LibFastToken.Data storage s = LibFastToken.data();
      // Note that we are not exactly following ERC20 here - we don't want to **set** the allowance to `amount`
      // to mitigate a possible attack.
      // See https://docs.google.com/document/d/1YLPtQxZu1UAvO9cZ1O2RPXBbT0mooh4DYKjA_jp-RLM/edit#heading=h.gmr6zdg47087.
      s.allowances[from][spender] += amount;
    // Keep track of given and received allowances.
      s.allowancesByOwner[from].add(spender, true);
      s.allowancesBySpender[spender].add(from, true);
    }

    // Emit!
    emit Approval(from, spender, amount);
  }

  /**
   * @notice Decreases allowance given by `from` to `spender` by `amount`.
   *
   * Business logic:
   * - Modifiers:
   *   - Only facets of the current diamond should be able to call this.
   * - The allowance given by `from` to `spender` is decreased by `amount`.
   * - Whether the allowance reached zero, stop tracking it by owner and by spender.
   * - Emit a `Disapproval(from, spender, amount)` event.
   * 
   * Note: This function runs when amount is zero, and will emit.
   */
  function performDisapproval(address from, address spender, uint256 amount)
      external
      onlyDiamondFacet {
    if (amount != 0) {
      LibFastToken.Data storage s = LibFastToken.data();

      // Remove allowance.
      s.allowances[from][spender] -= amount;

      // Whenever the allowance reaches zero, stop tracking it by owner and spender.
      if (s.allowances[from][spender] == 0) {
        s.allowancesByOwner[from].remove(spender, true);
        s.allowancesBySpender[spender].remove(from, true);
      }
    }

    // Emit!
    emit Disapproval(from, spender, amount);
  }

  // WARNING: This method contains two loops. We know that this should never
  // happen in solidity. However:
  // - In the context of our private chain, gas is cheap.
  // - It can only be called by a governor.
  function beforeRemovingMember(address member)
      external onlyDiamondFacet() {
    if (balanceOf(member) != 0)
      revert ICustomErrors.RequiresPositiveBalance(member);

    LibFastToken.Data storage s = LibFastToken.data();

    // Remove all given allowances.
    {
      address[] storage gaData = s.allowancesByOwner[member].values;
      while (gaData.length > 0) {
        // Make sure the call is performed externally so that we can mock.
        address spender = gaData[0];
        this.performDisapproval(member, spender, s.allowances[member][spender]);
      }
    }

    // Remove all received allowances.
    {
      address[] storage raData = s.allowancesBySpender[member].values;
      while (raData.length > 0) {
        // Make sure the call is performed externally so that we can mock.
        address owner = raData[0];
        this.performDisapproval(owner, member, s.allowances[owner][member]);
      }
    }
  }

  function holders()
      external view
      returns(address[] memory) {
    LibFastToken.Data storage s = LibFastToken.data();
    return s.tokenHolders.values;
  }

  function balanceChanged(address holder, uint256 balance)
      private {
    // Return early if this is the zero address.
    if (holder == address(0))
      return;

    LibFastToken.Data storage s = LibFastToken.data();

    // If this is a positive balance and it doesn't already exist in the set, add address.
    if (balance > 0 && !s.tokenHolders.contains(holder))
      s.tokenHolders.add(holder, false);
    // If the balance is 0 and it exists in the set, remove it.
    else if (balance == 0 && s.tokenHolders.contains(holder))
      s.tokenHolders.remove(holder, false);
  }

  // Private and helper methods.

  /**
   * @notice Ensures that the given address is a member of the current FAST or the Zero Address.
   *
   * Business logic:
   *   - If the candidate is the reserve, it is a valid token holder.
   *   - If the FAST is semi-public,
   *     - We require that candidate is a member of the Marketplace contract and is active in it.
   *   - Otherwise,
   *     - Require that the candidate is a member of the FAST.
   * @param candidate The address to check.
   * @return A boolean set to `true` if `candidate` can hold tokens, `false` otherwise.
   */
  function canHoldTokens(address candidate)
      private view returns(bool) {
    // Zero address can hold tokens, in any cases.
    if (candidate == address(0))
      return true;
    // If the FAST is semi public, any member of the marketplace can hold tokens.
    else if (IFast(address(this)).isSemiPublic()) {
      return IHasMembers(LibFast.data().marketplace).isMember(candidate);
    }
    // FAST is private, only members of the fast can hold tokens.
    else {
      return IHasMembers(address(this)).isMember(candidate);
    }
  }
}
