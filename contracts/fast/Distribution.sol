// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../interfaces/IERC20.sol';
import '../lib/LibAddressSet.sol';
import '../interfaces/IHasMembers.sol';
import '../interfaces/ICustomErrors.sol';
import 'hardhat/console.sol';


// TODO: TEST.
contract Distribution {
  using LibAddressSet for LibAddressSet.Data;

  enum Phase { Funding, FeeSetup, Setup, Withdrawal }

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
  // The target ERC20 currency to distribute to beneficiaries. Note that we do not
  // have control over the smart contract at `token` and therefore every call to this
  // address should be considered as sources of reentrancy.
  IERC20 public token;
  // How much is meant to be distributed.
  uint256 public total;

  // Whoever will get the fee...
  address public feeTaker;
  // How much is the fee...
  uint256 public fee;

  // How much is left for distribution, used to make sure that the amount we are
  // setting up during Setup do not exceed what was planned for.
  uint256 internal available;
  // Internal state flag to avoid re-entrancy.
  bool internal reentrant = false;

  LibAddressSet.Data beneficiaries;
  mapping(address => uint256) owings;

  // TODO: Only a FAST contract should be able to do this.
  constructor(address _fast, IERC20 _token, address _owner, uint256 _total, address _feeTaker)
      noReentrancy {
    // Set the internal state as Setup.
    phase = Phase.Funding;
    // Store all parameters.
    owner = _owner;
    fast = _fast;
    token = _token;
    total = available = _total;
    feeTaker = _feeTaker;
  }

  // TODO: Only allow backend to do this.
  function advance()
      public noReentrancy {
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
      phase = Phase.FeeSetup;
    }
    // Moving manually from the fee setup phase isn't supported, the way
    // to do this is to use the `setFee` method.
    else if (phase == Phase.FeeSetup) {
      revert ICustomErrors.UnsupportedOperation();
    }
    // If we are still in the Setup phase, progress to Withdrawal phase.
    else if (phase == Phase.Setup) {
      // It could be that some funds are in excess given the distribution plan.
      // If that's the case, return these funds to the owner before moving on.
      if (available > 0) {
        require(token.transfer(owner, available));
      }
      // Make sure the fee taker is already paid.
      performWithdrawal(feeTaker);
      // Move to next phase.
      phase = Phase.Withdrawal;
    } else {
      revert ICustomErrors.UnsupportedOperation();
    }
  }

  // TODO: RESTRICT ACCESS.
  function setFee(uint256 _fee)
      external onlyDuring(Phase.FeeSetup) {
    // Add the fee taker as a beneficiary without checking their FAST membership.
    addBeneficiary(feeTaker, _fee);
    // Advance to next phase.
    phase = Phase.Setup;
  }

  // TODO: RESTRICT ACCESS.
  function addBeneficiaries(address[] calldata _beneficiaries, uint256[] calldata _amounts)
      public onlyDuring(Phase.Setup) {
    // Beneficiaries and amount sizes must match.
    if (_beneficiaries.length != _amounts.length)
      revert ICustomErrors.UnsupportedOperation();

    // For each of the passed beneficiaries...
    for (uint256 i = 0; i < _beneficiaries.length;) {
      address beneficiary = _beneficiaries[i];
      // Make sure the beneficiary is a member of the FAST.
      if (!IHasMembers(fast).isMember(beneficiary))
        revert ICustomErrors.RequiresFastMembership(beneficiary);
      addBeneficiary(beneficiary, _amounts[i]);
      unchecked { ++i; }
    }
  }

  function addBeneficiary(address beneficiary, uint256 amount)
      internal {
    // There's not enough left to distribute...
    if (available < amount)
      revert ICustomErrors.InsuficientFunds(available, amount);
    // Add the beneficiary to our set.
    beneficiaries.add(beneficiary, false);
    // Keep track of the amount this beneficiary is entitled to.
    owings[beneficiary] = amount;
    // Decrease the amount left for distribution.
    unchecked { available -= amount; }
    // Emit!
    emit BeneficiaryAdded(beneficiary, amount);
  }

  // TODO: RESTRICT ACCESS.
  function removeBeneficiaries(address[] memory _beneficiaries)
      external onlyDuring(Phase.Setup) {
    // Remove all specified beneficiaries.
    for (uint256 i = 0; i < _beneficiaries.length;) {
      removeBeneficiary(_beneficiaries[i]);
      unchecked { ++i; }
    }
  }

  function removeBeneficiary(address beneficiary)
      internal {
    // Remove the beneficiary from our list.
    beneficiaries.remove(beneficiary, false);
    // Set their balance to zero.
    owings[beneficiary] = 0;
    // Emit!
    emit BeneficiaryRemoved(beneficiary);
  }

  function withdraw()
      public noReentrancy onlyDuring(Phase.Withdrawal) {
    performWithdrawal(msg.sender);
  }

  function performWithdrawal(address beneficiary)
      internal {
    // Memoize a few variables.
    uint256 amount = owings[beneficiary];
    // Transfer to the beneficiary all of their ownings.
    require(token.transfer(beneficiary, amount));
    // Make sure they can't do it again later...
    owings[beneficiary] = 0;
    // Emit!
    emit Withdrawal(beneficiary, amount);
  }

  function panic()
      public noReentrancy onlyOwner {
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
