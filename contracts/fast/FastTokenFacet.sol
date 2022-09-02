// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../interfaces/IERC20.sol';
import '../interfaces/IERC1404.sol';
import '../interfaces/IHasMembers.sol';
import '../interfaces/IHasGovernors.sol';
import '../interfaces/ITokenHoldings.sol';
import '../lib/LibDiamond.sol';
import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import './lib/AFastFacet.sol';
import './lib/LibFastToken.sol';
import './lib/IFast.sol';
import './FastTopFacet.sol';
import './FastAccessFacet.sol';
import './FastHistoryFacet.sol';
import './FastFrontendFacet.sol';


contract FastTokenFacet is AFastFacet, IERC20, IERC1404 {
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
    require(
      !FastTopFacet(address(this)).hasFixedSupply() || (s.totalSupply == 0 && this.balanceOf(address(0)) == 0),
      LibConstants.REQUIRES_CONTINUOUS_SUPPLY
    );

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

    require(!FastTopFacet(address(this)).hasFixedSupply(), LibConstants.REQUIRES_CONTINUOUS_SUPPLY);
    require(balanceOf(address(0)) >= amount, LibConstants.INSUFFICIENT_FUNDS);

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
   * - If the amount held by `holder` is zero,
   *   - Then the function should return early, with no action.
   * - The balance of `holder` should be set to zero.
   * - The reserve's balance should be increased by how much was on the holder's account.
   * - Total supply should be decreased by that amount too.
   * - The `holder`'s address should not be tracked as a token holder in this FAST anymore.
   * - The `holder`'s address should not be tracked as a token holder in the Marketplace anymore.
   * - A `Transfer(holder, reserve, amount)` event should be emited.
   * - Since the reserve balance and total supply have changed, the `FastFrontendFacet.emitDetailsChanged()` function should be called.
   * @param holder is the address for which to move the tokens from.
   */
  function retrieveDeadTokens(address holder)
      external
      onlyIssuerMember {
    // Cache how many tokens the holder has.
    uint256 amount = balanceOf(holder);
    // We won't do anything if the token holder doesn't have any.
    if (amount == 0) {
      return;
    }

    // Grab a pointer to the token storage.
    LibFastToken.Data storage s = LibFastToken.data();

    // Set the holder balance to zero.
    s.balances[holder] = 0;
    // Increment the reserve's balance.
    s.balances[address(0)] += amount;
    // The tokens aren't in circulation anymore - decrease total supply.
    s.totalSupply -= amount;

    // Since the holder's account is now empty, make sure to keep track of it both
    // in this FAST and in the marketplace.
    s.tokenHolders.remove(holder, true);
    ITokenHoldings(LibFast.data().marketplace).holdingUpdated(holder, address(this));


    // This operation can be seen as a regular transfer between holder and reserve. Emit.
    emit Transfer(holder, address(0), amount);
    // Total supply and reserve balance have changed - emit.
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  // Tranfer Credit management.

  /**
   * @notice Get the current `transferCredits` for this FAST.
   * @return Number of transfer credits remaining.
   */
  function transferCredits()
      external view returns(uint256) {
    return LibFastToken.data().transferCredits;
  }

  /// @notice Adds `amount` of transfer credits to this FAST.
  function addTransferCredits(uint256 amount)
      external
      onlyIssuerMember {
    LibFastToken.data().transferCredits += amount;
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
    emit TransferCreditsAdded(msg.sender, amount);
  }

  /**
   * @notice Drains the transfer credits from this FAST.
   *
   * Business logic:
   * - Modifiers:
   *   - Requires the caller to be a member of the Issuer contract.
   * - Emits a `TransferCreditsDrained(caller, previousTransferCredits)`.
   * - Sets transfer credits to zero.
   * - Calls `FastFrontendFacet.emitDetailsChanged`
   */
  function drainTransferCredits()
      external
      onlyIssuerMember {
    LibFastToken.Data storage s = LibFastToken.data();
    // Emit!
    emit TransferCreditsDrained(msg.sender, s.transferCredits);
    // Drain credits.
    s.transferCredits = 0;
    // Emit!
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
      external {
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
  }

  function allowance(address owner, address spender)
      public view override returns(uint256) {
    LibFastToken.Data storage s = LibFastToken.data();
    // If the allowance being queried is from the zero address and the spender
    // is a governor, we want to make sure that the spender has full rights over it.
    if (owner == address(0)) {
      require(FastAccessFacet(address(this)).isGovernor(spender), LibConstants.REQUIRES_FAST_GOVERNORSHIP);
      return s.balances[owner];
    }
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
      onlyMember(msg.sender) {
    // Make sure the call is performed externally so that we can mock.
    this.performDisapproval(msg.sender, spender, amount);
  }

  /**
   * @notice See `performTransfer`, the `ref` will be defaulted. */
  function transferFrom(address from, address to, uint256 amount)
      external override returns(bool) {
    transferFromWithRef(from, to, amount, LibFastToken.DEFAULT_TRANSFER_REFERENCE);
    return true;
  }

  /**
   * @notice See `performTransfer`. */
  function transferFromWithRef(address from, address to, uint256 amount, string memory ref)
      public {
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

  // ERC1404 implementation.

  function detectTransferRestriction(address, address, uint256)
      external pure override returns(uint8) {
    return 0;
  }

  function messageForTransferRestriction(uint8)
      external override pure returns(string memory) {
    revert(LibConstants.UNKNOWN_RESTRICTION_CODE);
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
   *   - Requires that `from` and `to` addresses are different.
   *   - Requires that `onlyTokenHolder` passes for the `from` address.
   *   - Requires that the `from` address is an active Marketplace contract member.
   *   - Requires that `onlyTokenHolder` passes for the `to` address.
   * - Requires that the `from` address has enough funds to cover for `amount`.
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
      external onlyDiamondFacet
      differentAddresses(p.from, p.to)
      onlyTokenHolder(p.from)
      onlyMarketplaceActiveMember(p.from)
      onlyTokenHolder(p.to) {
    LibFastToken.Data storage s = LibFastToken.data();

    // Make sure that there's enough funds.
    require(
      s.balances[p.from] >= p.amount,
      LibConstants.INSUFFICIENT_FUNDS
    );
    require(
      p.amount > 0,
      LibConstants.UNSUPPORTED_OPERATION
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

    // Keep track of who has what FAST.
    LibFast.Data storage d = LibFast.data();
    ITokenHoldings(d.marketplace).holdingUpdated(p.from, address(this));
    ITokenHoldings(d.marketplace).holdingUpdated(p.to, address(this));

    // Keep track of who holds this token.
    holdingUpdated(p.from);
    holdingUpdated(p.to);

    // If the funds are not moving from the zero address, decrease transfer credits.
    if (p.from != address(0)) {
      // Make sure enough credits exist.
      require(
        s.transferCredits >= p.amount,
        LibConstants.INSUFFICIENT_TRANSFER_CREDITS
      );
      s.transferCredits -= p.amount;
    }

    // If the funds are going to the ZERO address, decrease total supply.
    if (p.to == address(0)) {
      s.totalSupply -= p.amount;
      // If funds at address zero changed, we can emit a top-level details change event.
      FastFrontendFacet(address(this)).emitDetailsChanged();
    }
    // If the funds are moving from the zero address, increase total supply.
    else if (p.from == address(0)) {
      s.totalSupply += p.amount;
      // If funds at address zero changed, we can emit a top-level details change event.
      FastFrontendFacet(address(this)).emitDetailsChanged();
    }

    // Keep track of the transfer in the history facet.
    FastHistoryFacet(address(this)).transfered(p.spender, p.from, p.to, p.amount, p.ref);

    // Emit!
    emit Transfer(p.from, p.to, p.amount);
  }

  /**
   * @notice Increases the allowance given by `from` to `spender` by `amount`.
   *
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
   */
  function performApproval(address from, address spender, uint256 amount)
      external
      onlyDiamondFacet
      onlyTokenHolder(from) {
    require(amount > 0, LibConstants.REQUIRES_NON_ZERO_AMOUNT);
    LibFastToken.Data storage s = LibFastToken.data();

    // Note that we are not exactly following ERC20 here - we don't want to **set** the allowance to `amount`
    // to mitigate a possible attack.
    // See https://docs.google.com/document/d/1YLPtQxZu1UAvO9cZ1O2RPXBbT0mooh4DYKjA_jp-RLM/edit#heading=h.gmr6zdg47087.
    s.allowances[from][spender] += amount;
    // Keep track of given and received allowances.
    s.allowancesByOwner[from].add(spender, true);
    s.allowancesBySpender[spender].add(from, true);

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
   */
  function performDisapproval(address from, address spender, uint256 amount)
      external
      onlyDiamondFacet {
    LibFastToken.Data storage s = LibFastToken.data();

    // Remove allowance.
    s.allowances[from][spender] -= amount;

    // Whenever the allowance reaches zero, stop tracking it by owner and spender.
    if (s.allowances[from][spender] == 0) {
      s.allowancesByOwner[from].remove(spender, true);
      s.allowancesBySpender[spender].remove(from, true);
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
    require(balanceOf(member) == 0, 'Balance is positive');

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

  function holdingUpdated(address holder)
      private {
    // Return early if this is the zero address.
    if (holder == address(0)) {
      return;
    }

    LibFastToken.Data storage s = LibFastToken.data();
    uint256 balance = this.balanceOf(holder);

    // If this is a positive balance and it doesn't already exist in the set, add address.
    if (balance > 0 && !s.tokenHolders.contains(holder)) {
      s.tokenHolders.add(holder, false);
    }

    // If the balance is 0 and it exists in the set, remove it.
    if (balance == 0 && s.tokenHolders.contains(holder)) {
      s.tokenHolders.remove(holder, false);
    }
  }

  // Modifiers.

  /**
   * @notice Ensures that the given address is a member of the current FAST or the Zero Address.
   *
   * Business logic:
   *  - If the candidate is not the reserve,
   *    - If the fast is semi-public,
   *      - We require that candidate is a member of the Marketplace contract.
   *  - Otherwise,
   *    - Require that the candidate is a member of the Token contract.
   * @param candidate The address to check.
   */
  modifier onlyTokenHolder(address candidate) {
    // Only perform checks if the address is non-zero.
    if (candidate != address(0)) {
    // FAST is semi-public - the only requirement to hold tokens is to be an marketplace member.
      if (IFast(address(this)).isSemiPublic()) {
        require(
          IHasMembers(LibFast.data().marketplace).isMember(candidate),
          LibConstants.REQUIRES_MARKETPLACE_MEMBERSHIP
        );
      }
      // FAST is private, the requirement to hold tokens is to be a member of that FAST.
      else {
        require(
          IHasMembers(address(this)).isMember(candidate),
          LibConstants.REQUIRES_FAST_MEMBERSHIP
        );
      }
    }
    _;
  }
}
