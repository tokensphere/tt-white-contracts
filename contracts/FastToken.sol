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

  // Whether or not external people can hold and transfer tokens on this FAST.
  bool public isSemiPublic;

  // We have to track whether this token has continuous minting or fixed supply.
  bool public hasFixedSupply;

  // Our members balances are held here.
  mapping(address => uint256) private balances;
  // Allowances are stored here.
  mapping(address => mapping(address => uint256)) private allowances;
  mapping(address => AddressSetLib.Data) private allowancesByOwner;
  mapping(address => AddressSetLib.Data) private allowancesBySpender;

  /// Public stuff.

  function initialize(FastRegistry _reg,
                      string calldata _name,
                      string calldata _symbol,
                      uint256 _decimals,
                      bool _hasFixedSupply,
                      bool _isSemiPublic)
      external initializer {
    // Keep track of the SPC and Access contracts.
    reg = _reg;
    // Set up ERC20 related stuff.
    (name, symbol, decimals, totalSupply) = (_name, _symbol, _decimals, 0);
    // Initialize other internal stuff.
    (transferCredits, hasFixedSupply, isSemiPublic) = (0, _hasFixedSupply, _isSemiPublic);
  }

  function setHasFixedSupply(bool _hasFixedSupply)
      spcMembership(msg.sender)
      external returns(bool) {
    hasFixedSupply = _hasFixedSupply;
    return true;
  }

  /// Minting methods.

  function mint(uint256 amount, string calldata ref)
      spcMembership(msg.sender)
      external {
    // We want to make sure that either of these two is true:
    // - The token doesn't have fixed supply.
    // - The token has fixed supply but has no tokens yet (First and only mint).
    require(
      !hasFixedSupply || (totalSupply == 0 && balanceOf(ZERO_ADDRESS) == 0),
      'Minting not possible at this time'
    );

    // Prepare the minted amount on the zero address.
    balances[ZERO_ADDRESS] += amount;

    // Keep track of the minting operation.
    // Note that we're not emitting here, as the history contract will.
    reg.history().minted(amount, ref);

    // Emit!
    emit Minted(amount, ref);
  }

  function burn(uint256 amount, string calldata ref)
      spcMembership(msg.sender)
      external {
    require(!hasFixedSupply, 'Burning not possible at this time');
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
      senderMembershipOrSemiPublic(msg.sender)
      external override returns(bool) {
    _approve(msg.sender, spender, amount);
    return true;
  }

  function disapprove(address spender)
      senderMembershipOrSemiPublic(msg.sender)
      external returns(bool) {
    _disapprove(msg.sender, spender);
    return true;
  }

  function transferFrom(address from, address to, uint256 amount)
      public override returns(bool) {
    return transferFromWithRef(from, to, amount, 'Unspecified - via ERC20');
  }

  function transferFromWithRef(address from, address to, uint256 amount, string memory ref)
      public returns(bool) {
    // If the funds are coming from the zero address, we must be a governor.
    if (from == ZERO_ADDRESS) {
      require(reg.access().isGovernor(msg.sender), 'Missing governorship');
    } else {
      require(allowance(from, msg.sender) >= amount, 'Insuficient allowance');

      // Only decrease allowances if the sender of the funds isn't the zero address.
      uint256 newAllowance = allowances[from][msg.sender] -= amount;
      // If the allowance reached zero, we want to remove that allowance from
      // the various other places where we keep track of them.
      if (newAllowance == 0) {
        allowancesByOwner[from].remove(msg.sender, true);
        allowancesBySpender[msg.sender].remove(from, true);
      }
    }

    return _transfer(msg.sender, from, to, amount, ref);
  }

  /// Allowances query operations.

  function givenAllowanceCount(address owner)
      external view returns(uint256) {
    return allowancesByOwner[owner].values.length;
  }

  function paginateAllowancesByOwner(address owner, uint256 index, uint256 perPage)
      public view returns(address[] memory, uint256) {
    return PaginationLib.addresses(allowancesByOwner[owner].values, index, perPage);
  }

  function receivedAllowanceCount(address spender)
      external view returns(uint256) {
    return allowancesBySpender[spender].values.length;
  }

  function paginateAllowancesBySpender(address spender, uint256 index, uint256 perPage)
      public view returns(address[] memory, uint256) {
    return PaginationLib.addresses(allowancesBySpender[spender].values, index, perPage);
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
    } else if (from == to) {
      return SENDER_SAME_AS_RECIPIENT;
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
    } else if (restrictionCode == SENDER_SAME_AS_RECIPIENT) {
      return SENDER_SAME_AS_RECIPIENT_MESSAGE;
    }
    revert('Unknown restriction code');
  }

  // Private.

  function _transfer(address spender, address from, address to, uint256 amount, string memory ref)
      senderMembershipOrSemiPublic(from) recipientMembershipOrSemiPublic(to) differentAddresses(from, to)
      private returns(bool) {
    require(balances[from] >= amount, 'Insuficient funds');
    require(from == ZERO_ADDRESS || transferCredits >= amount, INSUFICIENT_TRANSFER_CREDITS_MESSAGE);

    // Keep track of the balances.
    balances[from] -= amount;
    balances[to] += amount;

    // If the funds are going to the ZERO address, decrease total supply.
    if (to == ZERO_ADDRESS) { totalSupply -= amount; }
    // If the funds are moving from the zero address, increase total supply.
    else if (from == ZERO_ADDRESS) { totalSupply += amount; }

    // Keep track of the transfer.
    reg.history().transfered(spender, from, to, amount, ref);

    // Emit!
    emit IERC20.Transfer(from, to, amount);
    return true;
  }

  function _approve(address from, address spender, uint256 amount)
      private {
    // Store allowance...
    allowances[from][spender] += amount;
    // Keep track of given and received allowances.
    allowancesByOwner[from].add(spender, true);
    allowancesBySpender[spender].add(from, true);

    // Emit!
    emit IERC20.Approval(from, spender, amount);
  }

  function _disapprove(address from, address spender)
      private {
    // Remove allowance.
    allowances[from][spender] = 0;
    allowancesByOwner[from].remove(spender, false);
    allowancesBySpender[spender].remove(from, false);

    // Emit!
    emit Disapproval(from, spender);
  }

  /// Callbacks from other contracts.

  // WARNING: This function contains two loops. We know that this should never
  // happen in solidity. However:
  // - In the context of our private chain, gas is cheap.
  // - It can only be called by a governor.
  function beforeRemovingMember(address member)
      accessContract(msg.sender)
      external override {
    // If there are token at member's address, move them back to the zero address.
    {
      uint256 balance = balanceOf(member);
      if (balance > 0) {
        _transfer(ZERO_ADDRESS, member, ZERO_ADDRESS, balance, 'Member removal');
      }
    }

    // Remove all given allowances.
    {
      address[] storage gaData = allowancesByOwner[member].values;
      while (gaData.length > 0) { _disapprove(member, gaData[0]); }
    }

    // Remove all received allowances.
    {
      address[] storage raData = allowancesBySpender[member].values;
      while (raData.length > 0) { _disapprove(raData[0], member); }
    }
  }

  // Modifiers.

  modifier spcMembership(address a) {
    require(reg.spc().isMember(a), 'Missing SPC membership');
    _;
  }

  modifier senderMembershipOrSemiPublic(address a) {
    require(
        reg.access().isMember(a) ||
        (isSemiPublic && reg.spc().exchange().isMember(a)) ||
          a == ZERO_ADDRESS,
        SENDER_NOT_MEMBER_MESSAGE
      );
    _;
  }

  modifier recipientMembershipOrSemiPublic(address a) {
    require(
        reg.access().isMember(a) ||
        (isSemiPublic && reg.spc().exchange().isMember(a)) ||
        a == ZERO_ADDRESS,
      RECIPIENT_NOT_MEMBER_MESSAGE);
    _;
  }

  modifier differentAddresses(address a, address b) {
    require(a != b, SENDER_SAME_AS_RECIPIENT_MESSAGE);
    _;
  }

  modifier accessContract(address a) {
    require(a == address(reg.access()), 'Cannot be called directly');
    _;
  }
}