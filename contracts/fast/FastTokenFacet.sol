// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../interfaces/IERC20.sol';
import '../interfaces/IERC1404.sol';
import '../interfaces/IHasMembers.sol';
import '../interfaces/IHasGovernors.sol';
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

  function mint(uint256 amount, string calldata ref)
      external
      onlySpcMember {
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

  function burn(uint256 amount, string calldata ref)
      external
      onlySpcMember {
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

  // Tranfer Credit management.

  function transferCredits()
      external view returns(uint256) {
    return LibFastToken.data().transferCredits;
  }

  function addTransferCredits(uint256 amount)
      external
      onlySpcMember {
    LibFastToken.data().transferCredits += amount;
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
    emit TransferCreditsAdded(msg.sender, amount);
  }

  function drainTransferCredits()
      external
      onlySpcMember {
    LibFastToken.Data storage s = LibFastToken.data();
    // Emit!
    emit TransferCreditsDrained(msg.sender, s.transferCredits);
    // Drain credits.
    s.transferCredits = 0;
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  // ERC20 implementation and transfer related methods.

  function name()
      external view returns(string memory) {
    return LibFastToken.data().name;
  }

  function symbol()
      external view returns(string memory) {
    return LibFastToken.data().symbol;
  }

  function decimals()
      external view returns(uint256) {
    return LibFastToken.data().decimals;
  }

  function totalSupply()
      external override view returns(uint256) {
    return LibFastToken.data().totalSupply;
  }

  function balanceOf(address owner)
      public view override returns(uint256) {
    return LibFastToken.data().balances[owner];
  }

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

  function approve(address spender, uint256 amount)
      external override returns(bool) {
    // Make sure the call is performed externally so that we can mock.
    this.performApproval(msg.sender, spender, amount);
    return true;
  }

  function disapprove(address spender)
      external
      onlyMember(msg.sender) {
    // Make sure the call is performed externally so that we can mock.
    this.performDisapproval(msg.sender, spender);
  }

  function transferFrom(address from, address to, uint256 amount)
      external override returns(bool) {
    transferFromWithRef(from, to, amount, LibFastToken.DEFAULT_TRANSFER_REFERENCE);
    return true;
  }

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

  function detectTransferRestriction(address from, address to, uint256 amount)
      external view override returns(uint8) {
    LibFastToken.Data storage s = LibFastToken.data();
    if (s.transferCredits < amount) {
      return LibFastToken.INSUFFICIENT_TRANSFER_CREDITS_CODE;
    } else if (!FastAccessFacet(address(this)).isMember(from) ||
               !FastAccessFacet(address(this)).isMember(to)) {
      return FastTopFacet(address(this)).isSemiPublic()
        ? LibFastToken.REQUIRES_EXCHANGE_MEMBERSHIP_CODE
        : LibFastToken.REQUIRES_FAST_MEMBERSHIP_CODE;
    } else if (from == to) {
      return LibFastToken.REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT_CODE;
    }
    return 0;
  }

  function messageForTransferRestriction(uint8 restrictionCode)
      external override pure returns(string memory) {
    if (restrictionCode == LibFastToken.INSUFFICIENT_TRANSFER_CREDITS_CODE) {
      return LibConstants.INSUFFICIENT_TRANSFER_CREDITS;
    } else if (restrictionCode == LibFastToken.REQUIRES_EXCHANGE_MEMBERSHIP_CODE) {
      return LibConstants.REQUIRES_EXCHANGE_MEMBERSHIP;
    } else if (restrictionCode == LibFastToken.REQUIRES_FAST_MEMBERSHIP_CODE) {
      return LibConstants.REQUIRES_FAST_MEMBERSHIP;
    } else if (restrictionCode == LibFastToken.REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT_CODE) {
      return LibConstants.REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT;
    }
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

  function performTransfer(TransferArgs calldata p)
      external onlyDiamondFacet
      differentAddresses(p.from, p.to)
      onlyTokenHolder(p.from)
      onlyExchangeActiveMember(p.from)
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

  function performApproval(address from, address spender, uint256 amount)
      external
      onlyDiamondFacet
      onlyTokenHolder(from) {
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
      onlyDiamondFacet {
    LibFastToken.Data storage s = LibFastToken.data();

    // Remove allowance.
    s.allowances[from][spender] = 0;
    s.allowancesByOwner[from].remove(spender, false);
    s.allowancesBySpender[spender].remove(from, false);

    // Emit!
    emit Disapproval(from, spender);
  }

  // WARNING: This function contains two loops. We know that this should never
  // happen in solidity. However:
  // - In the context of our private chain, gas is cheap.
  // - It can only be called by a governor.
  function beforeRemovingMember(address member)
      external onlyDiamondFacet() {
    require(balanceOf(member) == 0, 'Balance is positive');

    LibFastToken.Data storage s = LibFastToken.data();

    // Remove all given allowances.
    address[] storage gaData = s.allowancesByOwner[member].values;
    while (gaData.length > 0) {
      // Make sure the call is performed externally so that we can mock.
      this.performDisapproval(member, gaData[0]);
    }

    // Remove all received allowances.
    address[] storage raData = s.allowancesBySpender[member].values;
    while (raData.length > 0) {
      // Make sure the call is performed externally so that we can mock.
      this.performDisapproval(raData[0], member);
    }
  }

  // Modifiers.

  /** @dev Ensures that the given address is a member of the current FAST or the Zero Address.
   *  @param candidate The address to check.
   */
  modifier onlyTokenHolder(address candidate) {
    // Only perform checks if the address is non-zero.
    if (candidate != address(0)) {
    // FAST is semi-public - the only requirement to hold tokens is to be an exchange member.
      if (IFast(address(this)).isSemiPublic()) {
        require(
          IHasMembers(LibFast.data().exchange).isMember(candidate),
          LibConstants.REQUIRES_EXCHANGE_MEMBERSHIP
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
