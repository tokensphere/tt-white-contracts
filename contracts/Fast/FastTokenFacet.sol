// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../interfaces/IERC20.sol';
import '../interfaces/IERC1404.sol';
import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import './lib/index.sol';
import './FastAccessFacet.sol';
import './FastHistoryFacet.sol';
import './interfaces/AFastFacet.sol';


contract FastTokenFacet is AFastFacet, IERC20, IERC1404 {
  using LibAddressSet for LibAddressSet.Data;

  /// Constants.

  // We use the 0x0 address for all minting operations. A constant
  // to it will always come in handy.
  address constant private ZERO_ADDRESS = address(0);

  // Restriction codes.
  uint8 private constant INSUFICIENT_TRANSFER_CREDITS = 1;
  uint8 private constant SENDER_NOT_MEMBER = 2;
  uint8 private constant RECIPIENT_NOT_MEMBER = 3;
  uint8 private constant SENDER_SAME_AS_RECIPIENT = 4;
  // Restriction messages.
  string private constant INSUFICIENT_TRANSFER_CREDITS_MESSAGE = 'Insuficient transfer credits';
  string private constant SENDER_NOT_MEMBER_MESSAGE = 'Missing sender membership';
  string private constant RECIPIENT_NOT_MEMBER_MESSAGE = 'Missing recipient membership';
  string private constant SENDER_SAME_AS_RECIPIENT_MESSAGE = 'Identical sender and recipient';

  /// Events.

  event Minted(uint256 indexed amount, string indexed ref);
  event Burnt(uint256 indexed amount, string indexed ref);

  event TransferCreditsAdded(address indexed spcMember, uint256 amount);
  event TransferCreditsDrained(address indexed spcMember, uint256 amount);

  event Disapproval(address indexed owner, address indexed spender);

  /// Public functions.

  function isSemiPublic()
      external view returns(bool) {
    return LibFastToken.data().isSemiPublic;
  }

  function setIsSemiPublic(bool flag)
      external
      spcMembership(msg.sender) {
    LibFastToken.Data storage s = LibFastToken.data();
    // Someone is trying to toggle back to private?... No can do!isSemiPublic
    require(!s.isSemiPublic || s.isSemiPublic == flag, 'Operation is not supported');
    s.isSemiPublic = flag;
  }

  function hasFixedSupply()
      external view returns(bool) {
    return LibFastToken.data().hasFixedSupply;
  }

  function setHasFixedSupply(bool flag)
      external
      spcMembership(msg.sender) {
    LibFastToken.data().hasFixedSupply = flag;
  }

  /// Minting methods.

  function mint(uint256 amount, string calldata ref)
      external
      spcMembership(msg.sender) {
    LibFastToken.Data storage s = LibFastToken.data();
    // We want to make sure that either of these two is true:
    // - The token doesn't have fixed supply.
    // - The token has fixed supply but has no tokens yet (First and only mint).
    require(
      !s.hasFixedSupply || (s.totalSupply == 0 && balanceOf(ZERO_ADDRESS) == 0),
      'Minting not possible'
    );

    // Prepare the minted amount on the zero address.
    s.balances[ZERO_ADDRESS] += amount;

    // Keep track of the minting operation.
    FastHistoryFacet(address(this)).minted(amount, ref);

    // Emit!
    emit Minted(amount, ref);
  }

  function burn(uint256 amount, string calldata ref)
      external
      spcMembership(msg.sender) {
    LibFastToken.Data storage s = LibFastToken.data();

    require(!s.hasFixedSupply, 'Burning not possible');
    require(balanceOf(ZERO_ADDRESS) >= amount, 'Insuficient funds');

    // Remove the minted amount from the zero address.
    s.balances[ZERO_ADDRESS] -= amount;

    // Keep track of the minting operation.
    FastHistoryFacet(address(this)).burnt(amount, ref);

    // Emit!
    emit Burnt(amount, ref);
  }

  /// Tranfer Credit management.

  function transferCredits()
      external view returns(uint256) {
    return LibFastToken.data().transferCredits;
  }

  function addTransferCredits(uint256 _amount)
      external
      spcMembership(msg.sender) {
    LibFastToken.data().transferCredits += _amount;
    emit TransferCreditsAdded(msg.sender, _amount);
  }

  function drainTransferCredits()
      external
      spcMembership(msg.sender) {
    LibFastToken.Data storage s = LibFastToken.data();
    emit TransferCreditsDrained(msg.sender, s.transferCredits);
    s.transferCredits = 0;
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
      public override returns(bool) {
    _transfer(msg.sender, msg.sender, to, amount, 'Unspecified - via ERC20');
    return true;
  }

  function transferWithRef(address to, uint256 amount, string memory ref)
      public {
    return _transfer(msg.sender, msg.sender, to, amount, ref);
  }

  function allowance(address owner, address spender)
      public view override returns(uint256) {
    LibFastToken.Data storage s = LibFastToken.data();
    // If the allowance being queried is from the zero address and the spender
    // is a governor, we want to make sure that the spender has full rights over it.
    if (owner == ZERO_ADDRESS && FastAccessFacet(address(this)).isGovernor(spender)) {
      return s.balances[ZERO_ADDRESS];
   } else {
      return s.allowances[owner][spender];
    }
  }

  function approve(address spender, uint256 amount)
      external override
      senderMembership(msg.sender)
      returns(bool) {
    _approve(msg.sender, spender, amount);
    return true;
  }

  function disapprove(address spender)
      external
      senderMembership(msg.sender) {
    _disapprove(msg.sender, spender);
  }

  function transferFrom(address from, address to, uint256 amount)
      public override returns(bool) {
    transferFromWithRef(from, to, amount, 'Unspecified - via ERC20');
    return true;
  }

  function transferFromWithRef(address from, address to, uint256 amount, string memory ref)
      public {
    LibFastToken.Data storage s = LibFastToken.data();
    // If the funds are coming from the zero address, we must be a governor.
    if (from == ZERO_ADDRESS) {
      require(FastAccessFacet(address(this)).isGovernor(msg.sender), 'Missing governorship');
    } else {
      require(allowance(from, msg.sender) >= amount, 'Insuficient allowance');

      // Only decrease allowances if the sender of the funds isn't the zero address.
      uint256 newAllowance = s.allowances[from][msg.sender] -= amount;
      // If the allowance reached zero, we want to remove that allowance from
      // the various other places where we keep track of them.
      if (newAllowance == 0) {
        s.allowancesByOwner[from].remove(msg.sender, true);
        s.allowancesBySpender[msg.sender].remove(from, true);
      }
    }

    _transfer(msg.sender, from, to, amount, ref);
  }

  /// Allowances query operations.

  function givenAllowanceCount(address owner)
      external view returns(uint256) {
    return LibFastToken.data().allowancesByOwner[owner].values.length;
  }

  function paginateAllowancesByOwner(address owner, uint256 index, uint256 perPage)
      public view returns(address[] memory, uint256) {
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
      public view returns(address[] memory, uint256) {
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
    // TODO: Add semi-public cases.
    if (s.transferCredits < amount) {
      return INSUFICIENT_TRANSFER_CREDITS;
    } else if (!FastAccessFacet(address(this)).isMember(from)) {
      return SENDER_NOT_MEMBER;
    } else if (!FastAccessFacet(address(this)).isMember(to)) {
      return RECIPIENT_NOT_MEMBER;
    } else if (from == to) {
      return SENDER_SAME_AS_RECIPIENT;
    }
    return 0;
  }

  function messageForTransferRestriction(uint8 restrictionCode)
      external override pure returns(string memory) {
    if (restrictionCode == INSUFICIENT_TRANSFER_CREDITS) {
      return INSUFICIENT_TRANSFER_CREDITS_MESSAGE;
    } else if (restrictionCode == SENDER_NOT_MEMBER) {
      return SENDER_NOT_MEMBER_MESSAGE;
    } else if (restrictionCode == RECIPIENT_NOT_MEMBER) {
      return RECIPIENT_NOT_MEMBER_MESSAGE;
    } else if (restrictionCode == SENDER_SAME_AS_RECIPIENT) {
      return SENDER_SAME_AS_RECIPIENT_MESSAGE;
    }
    revert('Unknown restriction code');
  }

  // Private.

  function _transfer(address spender, address from, address to, uint256 amount, string memory ref)
      private
      senderMembership(from) recipientMembership(to) differentAddresses(from, to) {
    LibFastToken.Data storage s = LibFastToken.data();

    require(s.balances[from] >= amount, 'Insuficient funds');
    require(from == ZERO_ADDRESS || s.transferCredits >= amount, INSUFICIENT_TRANSFER_CREDITS_MESSAGE);

    // Keep track of the balances.
    s.balances[from] -= amount;
    s.balances[to] += amount;

    // If the funds are going to the ZERO address, decrease total supply.
    if (to == ZERO_ADDRESS) { s.totalSupply -= amount; }
    // If the funds are moving from the zero address, increase total supply.
    else if (from == ZERO_ADDRESS) { s.totalSupply += amount; }

    // Keep track of the transfer.
    FastHistoryFacet(address(this)).transfered(spender, from, to, amount, ref);

    // Emit!
    emit IERC20.Transfer(from, to, amount);
  }

  function _approve(address from, address spender, uint256 amount)
      private {
    LibFastToken.Data storage s = LibFastToken.data();

    // Store allowance...
    s.allowances[from][spender] += amount;
    // Keep track of given and received allowances.
    s.allowancesByOwner[from].add(spender, true);
    s.allowancesBySpender[spender].add(from, true);

    // Emit!
    emit IERC20.Approval(from, spender, amount);
  }

  function _disapprove(address from, address spender)
      private {
    LibFastToken.Data storage s = LibFastToken.data();

    // Remove allowance.
    s.allowances[from][spender] = 0;
    s.allowancesByOwner[from].remove(spender, false);
    s.allowancesBySpender[spender].remove(from, false);

    // Emit!
    emit Disapproval(from, spender);
  }

  /// Callbacks from other contracts.

  // WARNING: This function contains two loops. We know that this should never
  // happen in solidity. However:
  // - In the context of our private chain, gas is cheap.
  // - It can only be called by a governor.
  function beforeRemovingMember(address member)
      external diamondInternal() {
    LibFastToken.Data storage s = LibFastToken.data();

    // If there are token at member's address, move them back to the zero address.
    {
      uint256 balance = balanceOf(member);
      if (balance > 0) {
        _transfer(ZERO_ADDRESS, member, ZERO_ADDRESS, balance, 'Member removal');
      }
    }

    // Remove all given allowances.
    {
      address[] storage gaData = s.allowancesByOwner[member].values;
      while (gaData.length > 0) { _disapprove(member, gaData[0]); }
    }

    // Remove all received allowances.
    {
      address[] storage raData = s.allowancesBySpender[member].values;
      while (raData.length > 0) { _disapprove(raData[0], member); }
    }
  }

  // Modifiers.

  modifier senderMembership(address a) {
    LibFastToken.Data storage s = LibFastToken.data();
    require(
      FastAccessFacet(address(this)).isMember(a) ||
        (s.isSemiPublic && LibFast.data().exchange.isMember(a)) ||
        a == ZERO_ADDRESS,
      SENDER_NOT_MEMBER_MESSAGE
      );
    _;
  }

  modifier recipientMembership(address a) {
    LibFastToken.Data storage s = LibFastToken.data();
    require(
      FastAccessFacet(address(this)).isMember(a) ||
        (s.isSemiPublic && LibFast.data().exchange.isMember(a)) ||
        a == ZERO_ADDRESS,
      RECIPIENT_NOT_MEMBER_MESSAGE
    );
    _;
  }

  modifier differentAddresses(address a, address b) {
    require(a != b, SENDER_SAME_AS_RECIPIENT_MESSAGE);
    _;
  }
}
