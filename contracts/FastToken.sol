// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import './lib/AddressSetLib.sol';
import './lib/PaginationLib.sol';
import './FastRegistry.sol';
import './interfaces/IFastToken.sol';
import './interfaces/IERC20.sol';

/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract FastToken is Initializable, IFastToken {
  using AddressSetLib for AddressSetLib.Data;

  /// Constants.

  // We use the 0x0 address for all minting operations. A constant
  // to it will always come in handy.
  address constant private ZERO_ADDRESS = address(0);

  // Restriction codes.
  uint8 private constant INSUFICIENT_TRANSFER_CREDITS = 1;
  uint8 private constant SENDER_NOT_MEMBER = 2;
  uint8 private constant RECIPIENT_NOT_MEMBER = 3;
  // Restriction messages.
  string private constant INSUFICIENT_TRANSFER_CREDITS_MESSAGE = 'Insuficient transfer credits';
  string private constant SENDER_NOT_MEMBER_MESSAGE = 'Missing sender membership';
  string private constant RECIPIENT_NOT_MEMBER_MESSAGE = 'Missing recipient membership';

  /// Events.

  event Minted(uint256 indexed amount, string indexed ref);
  event Burnt(uint256 indexed amount, string indexed ref);
  event TransferCreditsAdded(address indexed spcMember, uint256 amount);
  event TransferCreditsDrained(address indexed spcMember, uint256 amount);

  /// Members.

  // This is a pointer to our contracts registry.
  FastRegistry public reg;

  // ERC20 related properties for this FAST Token.
  string public name;
  string public override symbol;
  uint256 public decimals;
  uint256 public override totalSupply;

  // Every time a transfer is executed, the credit decreases by the amount
  // of said transfer.
  // It becomes impossible to transact once it reaches zero, and must
  // be provisioned by an SPC governor.
  uint256 public transferCredits;

  // We have to track whether this token has continuous minting or fixed supply.
  bool public hasFixedSupply;

  // Our members balances are held here.
  mapping(address => uint256) private balances;
  // Allowances are stored here.
  mapping(address => mapping(address => uint256)) private allowances;
  mapping(address => AddressSetLib.Data) private givenAllowances;
  mapping(address => AddressSetLib.Data) private receivedAllowances;

  /// Public stuff.

  function initialize(FastRegistry _reg,
                      string memory _name,
                      string memory _symbol,
                      uint256 _decimals,
                      bool _hasFixedSupply)
      public initializer {
    // Keep track of the SPC and Access contracts.
    reg = _reg;
    // Set up ERC20 related stuff.
    (name, symbol, decimals, totalSupply) = (_name, _symbol, _decimals, 0);
    // Initialize other internal stuff.
    (transferCredits, hasFixedSupply) = (0, _hasFixedSupply);
  }

  function setHasFixedSupply(bool _hasFixedSupply)
      spcMembership(msg.sender)
      external returns(bool) {
    hasFixedSupply = _hasFixedSupply;
    return true;
  }

  /// Minting methods.

  function mint(uint256 amount, string memory ref)
      spcMembership(msg.sender)
      external {
    // We want to make sure that either of these two is true:
    // - The token doesn't have fixed supply.
    // - The token has fixed supply but has no tokens yet (First and only mint).
    require(!hasFixedSupply || (totalSupply == 0 && balanceOf(ZERO_ADDRESS) == 0), 'Minting not possible at this time');

    // Prepare the minted amount on the zero address.
    balances[ZERO_ADDRESS] += amount;

    // Keep track of the minting operation.
    // Note that we're not emitting here, as the history contract will.
    reg.history().minted(amount, ref);

    // Emit!
    emit Minted(amount, ref);
  }

  function burn(uint256 amount, string memory ref)
      spcMembership(msg.sender)
      external {
    require(!hasFixedSupply, 'Unminting not possible at this time');
    require(balanceOf(ZERO_ADDRESS) >= amount, 'Insuficient funds');

    // Remove the minted amount from the zero address.
    balances[ZERO_ADDRESS] -= amount;

    // Keep track of the minting operation.
    // Note that we're not emitting here, as the history contract will.
    reg.history().burnt(amount, ref);

    // Emit!
    emit Burnt(amount, ref);
  }

  /// Tranfer Credit management.

  function addTransferCredits(uint256 _amount)
      spcMembership(msg.sender)
      external returns(bool) {
    transferCredits += _amount;
    emit TransferCreditsAdded(msg.sender, _amount);
    return true;
  }

  function drainTransferCredits()
      spcMembership(msg.sender)
      external returns(bool) {
    emit TransferCreditsDrained(msg.sender, transferCredits);
    transferCredits = 0;
    return true;
  }

  /// ERC20 implementation and transfer related methods.

  function balanceOf(address owner)
      public view override returns(uint256) {
    return balances[owner];
  }

  function transfer(address to, uint256 amount)
      public override returns(bool) {
    return _transfer(msg.sender, msg.sender, to, amount, 'Unspecified - via ERC20');
  }

  function transferWithRef(address to, uint256 amount, string memory ref)
      public returns(bool) {
    return _transfer(msg.sender, msg.sender, to, amount, ref);
  }

  function allowance(address owner, address spender)
      public view override returns(uint256) {
    // If the allowance being queried is from the zero address and the spender
    // is a governor, we want to make sure that the spender has full rights over it.
    if (owner == ZERO_ADDRESS && reg.access().isGovernor(spender)) {
      return balances[ZERO_ADDRESS];
   } else {
      return allowances[owner][spender];
    }
  }

  function approve(address spender, uint256 amount)
      senderMembershipOrZero(msg.sender)
      external override returns(bool) {
    // Store allowance...
    allowances[msg.sender][spender] += amount;
    // Keep track of given and received allowances.
    givenAllowances[msg.sender].add(spender, true);
    receivedAllowances[spender].add(msg.sender, true);

    // Emit events.
    emit IERC20.Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(address from, address to, uint256 amount)
      public override returns(bool) {
    return transferFromWithRef(from, to, amount, 'Unspecified - via ERC20');
  }

  function transferFromWithRef(address from, address to, uint256 amount, string memory ref)
      public returns(bool) {
    require(allowance(from, msg.sender) >= amount, 'Insuficient allowance');

    // Only decrease allowances if the sender of the funds isn't the zero address.
    if (from != ZERO_ADDRESS) {
      uint256 newAllowance = allowances[from][msg.sender] -= amount;
      // If the allowance reached zero, we want to remove that allowance from
      // the various other places where we keep track of them.
      if (newAllowance == 0) {
        givenAllowances[from].remove(msg.sender, true);
        receivedAllowances[msg.sender].remove(from, true);
      }
    }

    return _transfer(msg.sender, from, to, amount, ref);
  }

  /// Allowances query operations.

  function paginateGivenAllowances(address owner, uint256 index, uint256 perPage)
      public view returns(address[] memory, uint256) {
    return PaginationLib.addresses(givenAllowances[owner].values, index, perPage);
  }

  function paginateReceivedAllowances(address spender, uint256 index, uint256 perPage)
      public view returns(address[] memory, uint256) {
    return PaginationLib.addresses(receivedAllowances[spender].values, index, perPage);
  }

  /// ERC1404 implementation.

  function detectTransferRestriction(address from, address to, uint256 amount)
      external view override returns(uint8) {
    if (transferCredits < amount) {
      return INSUFICIENT_TRANSFER_CREDITS;
    } else if (!reg.access().isMember(from)) {
      return SENDER_NOT_MEMBER;
    } else if (!reg.access().isMember(to)) {
      return RECIPIENT_NOT_MEMBER;
    }
    return 0;
  }

  function messageForTransferRestriction(uint8 restrictionCode)
      pure external override returns(string memory) {
    if (restrictionCode == INSUFICIENT_TRANSFER_CREDITS) {
      return INSUFICIENT_TRANSFER_CREDITS_MESSAGE;
    } else if (restrictionCode == SENDER_NOT_MEMBER) {
      return SENDER_NOT_MEMBER_MESSAGE;
    } else if (restrictionCode == RECIPIENT_NOT_MEMBER) {
      return RECIPIENT_NOT_MEMBER_MESSAGE;
    }
    revert('Unknown restriction code');
  }

  // Private.

  function _transfer(address spender, address from, address to, uint256 amount, string memory ref)
      requiresTxCredit(from, amount) senderMembershipOrZero(from) recipientMembershipOrZero(to)
      internal returns(bool) {
    require(balances[from] >= amount, 'Insuficient funds');

    // Keep track of the balances.
    balances[from] -= amount;
    balances[to] += amount;

    // If the funds are going to the ZERO address, decrease total supply.
    if (to == ZERO_ADDRESS) {
      totalSupply -= amount;
    }
    // If the funds are moving from the zero address, increase total supply.
    else if (from == ZERO_ADDRESS) {
      totalSupply += amount;
    }

    // Keep track of the transfer.
    reg.history().transfered(spender, from, to, amount, ref);

    // Emit!
    emit IERC20.Transfer(from, to, amount);
    return true;
  }

  // Modifiers.

  modifier requiresTxCredit(address from, uint256 amount) {
    require(from == ZERO_ADDRESS || transferCredits >= amount, INSUFICIENT_TRANSFER_CREDITS_MESSAGE);
    _;
  }

  modifier spcMembership(address a) {
    require(reg.spc().isMember(a), 'Missing SPC membership');
    _;
  }

  modifier senderMembershipOrZero(address a) {
    require(reg.access().isMember(a) || a == ZERO_ADDRESS, SENDER_NOT_MEMBER_MESSAGE);
    _;
  }

  modifier recipientMembershipOrZero(address a) {
    require(reg.access().isMember(a) || a == ZERO_ADDRESS, RECIPIENT_NOT_MEMBER_MESSAGE);
    _;
  }
}