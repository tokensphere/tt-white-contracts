// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../interfaces/IERC20.sol';
import '../lib/LibAddressSet.sol';
import '../interfaces/IHasMembers.sol';
import '../interfaces/ICustomErrors.sol';
import 'hardhat/console.sol';


contract Distribution {
  using LibAddressSet for LibAddressSet.Data;

  enum Phase { Funding, Setup, Withdrawal }

  event BeneficiaryAdded(address indexed beneficiary, uint256 indexed amount);
  event BeneficiaryRemoved(address indexed beneficiary);
  event Withdrawal(address indexed beneficiary, uint256 amount);

  // The phase at which the distribution is at.
  Phase public phase;

  uint16 public constant STORAGE_VERSION = 1;

  // Who will own this distribution...
  address public owner;
  // Which FAST this Distribution belongs to.
  address public fast;
  // The target ERC20 currency to distribute to beneficiaries.
  IERC20 public token;
  // How much is meant to be distributed.
  uint256 private total;
  // How much is left for distribution, used to make sure that the amount we are
  // setting up during Setup do not exceed what was planned for.
  uint256 private available;

  // Internal state flag to avoid re-entrancy.
  bool private reentrant = false;

  LibAddressSet.Data beneficiaries;
  mapping(address => uint256) balances;

  // TODO: Only a FAST contract should be able to do this.
  constructor(address _fast, IERC20 _token, address _owner, uint256 _total)
      noReentrancy {
    // Set the internal state as Setup.
    phase = Phase.Funding;
    // Store all parameters.
    owner = _owner;
    fast = _fast;
    token = _token;
    total = available = _total;
  }

  // TODO: Only allow backend to do this.
  function advance()
      public
      noReentrancy {
    console.log('Phase', uint8(phase));
    // We are still in the funding phase. Let's check that this contract is allowed to spend
    // on behalf of the owner.
    if (phase == Phase.Funding) {
      // Make sure that the allowance is set.
      uint256 allowance = token.allowance(owner, address(this));
      console.log('Allowance', allowance);
      if (allowance < total)
        revert ICustomErrors.InsuficientFunds(allowance, total);
      // Attempt to transfer `total` from the owner's account to this new contract address.
      require(token.transferFrom(owner, address(this), total));
      // Move to next phase.
      phase = Phase.Setup;
    }
    // If we are still in the Setup phase, progress to Withdrawal phase.
    else if (phase == Phase.Setup) {
      // It could be that some funds are in excess given the distribution plan.
      // If that's the case, return these funds to the owner before moving on.
      if (available > 0) {
        require(token.transfer(owner, available));
      }
      // Move to next phase.
      phase = Phase.Withdrawal;
    } else {
      revert ICustomErrors.UnsupportedOperation();
    }
  }

  // TODO: RESTRICT ACCESS.
  function addBeneficiaries(address[] memory _beneficiaries, uint256[] memory _amounts)
      external
      onlyDuring(Phase.Setup) {
    if (_beneficiaries.length != _amounts.length)
      revert ICustomErrors.UnsupportedOperation();

    // For each of the passed beneficiaries...
    uint256 needed = 0;
    for (uint256 i = 0; i < _beneficiaries.length; ++i) {
      // Memoize a few variables.
      address beneficiary = _beneficiaries[i];
      uint256 amount = _amounts[i];

      // Make sure the beneficiary is a member of the FAST.
      if (!IHasMembers(fast).isMember(beneficiary))
        revert ICustomErrors.RequiresFastMembership(beneficiary);

      // Add the beneficiary to our set.
      beneficiaries.add(beneficiary, false);
      // Keep track of the amount this beneficiary is entitled to.
      balances[beneficiary] = amount;
      // Decrease the amount left for distribution.
      needed += amount;
      // Emit!
      emit BeneficiaryAdded(beneficiary, amount);
    }
    // Check that there are enough funds locked here.
    if (available < needed)
      revert ICustomErrors.InsuficientFunds(available, needed);
    // Decrease the amount of funds still available to distribute.
    available -= needed;
  }

  // TODO: RESTRICT ACCESS.
  function removeBeneficiaries(address[] memory _beneficiaries)
      external
      onlyDuring(Phase.Setup) {
    // Remove all specified beneficiaries.
    for (uint256 i = 0; i < _beneficiaries.length; ++i) {
      // Memoize the beneficiary.
      address beneficiary = _beneficiaries[i];
      // Remove the beneficiary from our list.
      beneficiaries.remove(beneficiary, false);
      // Set their balance to zero.
      balances[beneficiary] = 0;
      // Emit!
      emit BeneficiaryRemoved(beneficiary);
    }
  }

  function withdraw()
      public
      noReentrancy onlyDuring(Phase.Withdrawal) {
    // Memoize a few variables.
    address beneficiary = msg.sender;
    uint256 amount = balances[beneficiary];
    // Transfer to the beneficiary all of their ownings.
    require(token.transfer(beneficiary, amount));
    // Make sure they can't do it again later...
    balances[beneficiary] = 0;
    // Emit!
    emit Withdrawal(beneficiary, amount);
  }

  function panic()
      public
      noReentrancy onlyOwner {
    // Move all funds to the caller account.
    token.transfer(owner, token.balanceOf(address(this)));
  }

  // Modifiers

  modifier onlyDuring(Phase _phase) {
    if (_phase != phase)
      revert ICustomErrors.UnsupportedOperation();
    _;
  }

  modifier onlyOwner() {
    if (msg.sender != owner)
      revert ICustomErrors.RequiresDistributionOwner(msg.sender);
    _;
  }

  modifier noReentrancy() {
    if (reentrant)
      revert ICustomErrors.ReentrancyError();
    reentrant = true;
    _;
    reentrant = false;
  }
}
