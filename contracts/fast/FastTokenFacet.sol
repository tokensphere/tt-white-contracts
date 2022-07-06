// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../interfaces/IERC20.sol';
import '../interfaces/IERC1404.sol';
import '../lib/LibDiamond.sol';
import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import './lib/AFastFacet.sol';
import './lib/LibFastToken.sol';
import './FastTokenInternalFacet.sol';
import './FastAccessFacet.sol';
import './FastHistoryFacet.sol';
import './FastFrontendFacet.sol';


contract FastTokenFacet is AFastFacet, IERC20, IERC1404 {
  using LibAddressSet for LibAddressSet.Data;

  // Events.

  // Issuance related events.
  event Minted(uint256 indexed amount, string indexed ref);
  event Burnt(uint256 indexed amount, string indexed ref);

  // Transfer credits related events.
  event TransferCreditsAdded(address indexed spcMember, uint256 amount);
  event TransferCreditsDrained(address indexed spcMember, uint256 amount);

  // Public functions.

  function isSemiPublic()
      external view returns(bool) {
    return LibFastToken.data().isSemiPublic;
  }

  function setIsSemiPublic(bool flag)
      external
      spcMembership {
    LibFastToken.Data storage s = LibFastToken.data();
    // Someone is trying to toggle back to private?... No can do!isSemiPublic
    require(!s.isSemiPublic || s.isSemiPublic == flag, LibConstants.UNSUPPORTED_OPERATION);
    s.isSemiPublic = flag;
  }

  function hasFixedSupply()
      external view returns(bool) {
    return LibFastToken.data().hasFixedSupply;
  }

  function setHasFixedSupply(bool flag)
      external
      spcMembership {
    LibFastToken.data().hasFixedSupply = flag;
  }

  /// Minting methods.

  function mint(uint256 amount, string calldata ref)
      external
      spcMembership {
    LibFastToken.Data storage s = LibFastToken.data();
    // We want to make sure that either of these two is true:
    // - The token doesn't have fixed supply.
    // - The token has fixed supply but has no tokens yet (First and only mint).
    require(
      !s.hasFixedSupply || (s.totalSupply == 0 && balanceOf(address(0)) == 0),
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
      spcMembership {
    LibFastToken.Data storage s = LibFastToken.data();

    require(!s.hasFixedSupply, LibConstants.REQUIRES_CONTINUOUS_SUPPLY);
    require(balanceOf(address(0)) >= amount, LibConstants.INSUFFICIENT_FUNDS);

    // Remove the minted amount from the zero address.
    s.balances[address(0)] -= amount;

    // Keep track of the minting operation.
    FastHistoryFacet(address(this)).burnt(amount, ref);

    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
    emit Burnt(amount, ref);
  }

  /// Tranfer Credit management.

  function transferCredits()
      external view returns(uint256) {
    return LibFastToken.data().transferCredits;
  }

  function addTransferCredits(uint256 amount)
      external
      spcMembership {
    LibFastToken.data().transferCredits += amount;
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
    emit TransferCreditsAdded(msg.sender, amount);
  }

  function drainTransferCredits()
      external
      spcMembership {
    LibFastToken.Data storage s = LibFastToken.data();
    // Emit!
    emit TransferCreditsDrained(msg.sender, s.transferCredits);
    // Drain credits.
    s.transferCredits = 0;
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  /// ERC20 implementation and transfer related methods.

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
    FastTokenInternalFacet(address(this))
      .performTransfer(
        FastTokenInternalFacet.TransferArgs({
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
    FastTokenInternalFacet(address(this))
      .performTransfer(
        FastTokenInternalFacet.TransferArgs({
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
    FastTokenInternalFacet(address(this))
      .performApproval(msg.sender, spender, amount);
    return true;
  }

  function disapprove(address spender)
      external
      membership(msg.sender) {
    FastTokenInternalFacet(address(this))
      .performDisapproval(msg.sender, spender);
  }

  function transferFrom(address from, address to, uint256 amount)
      external override returns(bool) {
    transferFromWithRef(from, to, amount, LibFastToken.DEFAULT_TRANSFER_REFERENCE);
    return true;
  }

  function transferFromWithRef(address from, address to, uint256 amount, string memory ref)
      public {
    FastTokenInternalFacet(address(this))
      .performTransfer(
        FastTokenInternalFacet.TransferArgs({
          spender: msg.sender,
          from: from,
          to: to,
          amount: amount,
          ref: ref
        }));
  }

  /// Allowances query operations.

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

  /// ERC1404 implementation.

  function detectTransferRestriction(address from, address to, uint256 amount)
      external view override returns(uint8) {
    LibFastToken.Data storage s = LibFastToken.data();
    if (s.transferCredits < amount) {
      return LibFastToken.INSUFFICIENT_TRANSFER_CREDITS_CODE;
    } else if (!FastAccessFacet(address(this)).isMember(from) ||
               !FastAccessFacet(address(this)).isMember(to)) {
      return s.isSemiPublic
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

  // Callbacks from other contracts.

  // WARNING: This function contains two loops. We know that this should never
  // happen in solidity. However:
  // - In the context of our private chain, gas is cheap.
  // - It can only be called by a governor.
  function beforeRemovingMember(address member)
      external diamondInternal() {
    require(balanceOf(member) == 0, 'Balance is positive');

    LibFastToken.Data storage s = LibFastToken.data();

    // Remove all given allowances.
    address[] storage gaData = s.allowancesByOwner[member].values;
    while (gaData.length > 0) {
      FastTokenInternalFacet(address(this))
        .performDisapproval(member, gaData[0]);
    }

    // Remove all received allowances.
    address[] storage raData = s.allowancesBySpender[member].values;
    while (raData.length > 0) {
      FastTokenInternalFacet(address(this))
        .performDisapproval(raData[0], member);
    }
  }
}
