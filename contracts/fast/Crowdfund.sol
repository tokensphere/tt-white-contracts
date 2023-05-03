// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibAddressSet.sol';
import '../interfaces/IERC20.sol';
import '../common/AHasMembers.sol';
import '../common/AHasGovernors.sol';
import '@openzeppelin/contracts/utils/math/Math.sol';


/**
 * @title The `Crowdfund` FAST contract.
 * @notice This contract is used to manage a crowdfunding campaign.
 */
contract Crowdfund {
  using LibAddressSet for LibAddressSet.Data;

  /// @notice Happens when a function requires an unmet phase.
  error InvalidPhase();
  /// @notice Happens when a duplicate entry is found.
  error DuplicateEntry();
  /// @notice Happens when inconsistent parametters are detected.
  error InconsistentParameter(string param);
  /// @notice Happens when an address is not a crowdfund pledger.
  error UnknownPledger(address who);
  /// @notice Happens when a call to the ERC20 token contract fails.
  error TokenContractError();
  /// @notice Happens when there are insufficient funds somewhere.
  error InsufficientFunds(uint256 amount);

  /// @notice Happens when an address is not an issuer member.
  error RequiresIssuerMemberCaller();
  /// @notice Happens when an address is not a FAST member.
  error RequiresFastMemberCaller();
  /// @notice Happens when a parameter has to be a FAST governor.
  error RequiresFastGovernorship(address who);
  /// @notice Happens when a parameter has to be a FAST member.
  error RequiresFastMembership(address who);

  /**
   * @notice Emited whenever the internal phase of this crowdfund changes.
   * @param phase The new phase of this contract.
   */
  event Advance(Phase phase);

  /**
   * @notice Emited whenever a plege is made.
   * @param pledger The address of the pledger.
   * @param amount The amount of tokens pledged.
   */
  event Pledge(address indexed pledger, uint256 amount);

  /**
   * @notice Emited when the crowdfunding is terminated.
   * @param success Whether the crowdfunding was successful or not.
   */
  event Terminated(bool indexed success);

  /// @notice The different phases of the crowdfund.
  enum Phase { Setup, Funding, Success, Failure }

  /// @notice Parameters to be passed to this contract's constructor.
  struct Params {
    /// @notice Who initially deployed this contract.
    address owner;
    /// @notice The issuer contract address.
    address issuer;
    /// @notice The FAST contract that this crowdfund is locked onto.
    address fast;
    /// @notice The beneficiary of the crowdfund.
    address beneficiary;
    /// @notice The token contract address.
    IERC20 token;
    /// @notice An arbitrary reference string to keep track of.
    string ref;
  }

  /// @notice A version identifier for us to track what's deployed.
  uint16 public constant VERSION = 2;

  /// @notice The initial params, as passed to the contract's constructor.
  Params public params;
  /// @notice The phase at which the crowdfunding is at.
  Phase public phase;
  /// @notice When was the distribution created.
  uint256 public creationBlock;
  /// @notice The fee expressed in basis points - eg ten thousandths.
  uint256 public basisPointsFee;
  /// @notice How much was collected so far.
  uint256 public collected;

  /// @notice The set of addresses that have pledged to this crowdfund.
  LibAddressSet.Data internal pledgerSet;
  /// @notice The mapping of pledgers to their pledged amounts.
  mapping(address => uint256) public pledges;
  /// @notice Mapping of pledgers to whether they have been refunded or not.
  mapping(address => bool) public refunded;

  /**
   * @notice The constructor for this contract.
   * Note that the constructor places the contract into the setup phase.
   * @param p The parameters to be passed to this contract's constructor.
   */
  constructor(Params memory p) {
    // Store parameters.
    params = p;
    // Check that the owner is a member of the FAST contract.
    if (!isFastGovernor(p.owner))
      revert RequiresFastGovernorship(p.owner);
    // Check that the beneficiary is a member of the FAST contract.
    else if (!isFastMember(p.beneficiary))
      revert RequiresFastMembership(p.beneficiary);
    // Keep creation block handy.
    creationBlock = block.number;
  }

  /// @dev Given a total and a fee in basis points, returns the fee amount rounded up.
  function feeAmount()
      public view returns(uint256) {
    return Math.mulDiv(collected, basisPointsFee, 10_000, Math.Rounding.Up);
  }

  /**
   * @notice Advances the campaign to the funding phase.
   * Note that this method is only available during the setup phase.
   * @param _basisPointsFee The fee expressed in basis points - eg ten thousandths.
   */
  function advanceToFunding(uint256 _basisPointsFee)
      external onlyDuring(Phase.Setup) onlyIssuerMember {
    // Make sure the fee doesn't exceed a hundred percent.
    if (_basisPointsFee > 10_000)
      revert InconsistentParameter("basisPointsFee");
    basisPointsFee = _basisPointsFee;
    emit Advance(phase = Phase.Funding);
  }

  /**
   * @notice Allows a pledger to pledge tokens to this crowdfund.
   * Note that this method is only available during the funding phase.
   * @param amount The amount of tokens to pledge.
   */
  function pledge(uint256 amount)
      public onlyDuring(Phase.Funding) onlyFastMember {
    // Make sure the amount is non-zero.
    if (amount == 0)
      revert InconsistentParameter("amount");
    // Make sure that the message sender gave us allowance for at least this amount.
    uint256 allowance = params.token.allowance(msg.sender, address(this));
    if (allowance < amount)
      revert InsufficientFunds(amount - allowance);
    // Keep track of the pledger - don't throw if already present.
    pledgerSet.add(msg.sender, true);
    // Add the pledged amount to the existing pledge.
    pledges[msg.sender] += amount;
    // Update the collected amount.
    collected += amount;
    // Transfer the tokens to this contract.
    if (!params.token.transferFrom(msg.sender, address(this), amount))
      revert TokenContractError();
    // Emit!
    emit Pledge(msg.sender, amount);
  }

  /**
   * @notice Queries the number of members.
   * @return An `uint256`.
   */
  function pledgerCount()
      external view returns(uint256) {
    return pledgerSet.values.length;
  }

  /**
   * @notice Queries pages of pledgers based on a start index and a page size.
   * @param index is the offset at which the pagination operation should start.
   * @param perPage is how many items should be returned.
   * @return A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page.
   */
  function paginatePledgers(uint256 index, uint256 perPage)
      external view returns(address[] memory, uint256) {
    return LibPaginate.addresses(pledgerSet.values, index, perPage);
  }

  /**
   * @notice Allows an issuer member to terminate the crowdfunding given a success flag.
   * Note that this method is available during any phase and can be used as a panic
   * button to terminate the crowdfunding prematurely.
   * @param success Whether the crowdfunding was successful or not.
   */
  function terminate(bool success)
      public onlyIssuerMember {
    // If the crowdfunding was successful...
    if (success) {
      // Transfer the fee to the issuer contract if there is one.
      uint256 finalFee = feeAmount();
      if (finalFee > 0)
        if (!params.token.transfer(params.issuer, finalFee))
          revert TokenContractError();
      // Transfer the payout to the beneficiary.
      uint256 payout = collected - finalFee;
      // If there's a payout for the beneficiary, transfer it.
      if (payout > 0)
        // Make sure that the beneficiary is **still** a member of the FAST contract.
        if (!isFastMember(params.beneficiary))
          revert RequiresFastMembership(params.beneficiary);
        // Attempt to transfer to the beneficiary.
        else if (!params.token.transfer(params.beneficiary, payout))
          revert TokenContractError();
    }
    // Advance to next phase.
    emit Advance(phase = success ? Phase.Success : Phase.Failure);
  }

  /**
   * @notice Allows a pledger to be refunded if the crowdfunding failed.
   * Note that this method is only available during the failure phase.
   * @param pledger The address of the pledger to refund.
   */
  function refund(address pledger)
      public onlyDuring(Phase.Failure) {
    // Make sure the pledger is in the set.
    if (!pledgerSet.contains(pledger))
      revert UnknownPledger(pledger);
    // Pledger has already been refunded...
    else if (refunded[pledger])
      revert DuplicateEntry();
    // Track that the pledger has been refunded.
    refunded[pledger] = true;
    // Transfer the tokens to the pledger.
    if (!params.token.transfer(pledger, pledges[pledger]))
      revert TokenContractError();
  }

  /// Modifiers and ACL functions.

  /**
   * @notice Checks whether the given address is a governor of the FAST contract.
   * @param who The address to check.
   * @return A `bool` indicating whether the address is a governor of the FAST contract.
   */
  function isFastGovernor(address who)
      internal view returns(bool) {
    return AHasGovernors(params.fast).isGovernor(who);
  }

  /**
   * @dev Checks whether the given address is a member of the FAST contract.
   * @param who The address to check.
   * @return A `bool` indicating whether the address is a member of the FAST contract.
   */
  function isFastMember(address who)
      internal view returns(bool) {
    return AHasMembers(params.fast).isMember(who);
  }

  modifier onlyDuring(Phase _phase) {
    if (_phase != phase)
      revert InvalidPhase();
    _;
  }

  modifier onlyIssuerMember() {
    if (!AHasMembers(params.issuer).isMember(msg.sender))
      revert RequiresIssuerMemberCaller();
    _;
  }

  modifier onlyFastMember() {
    if (!isFastMember(msg.sender))
      revert RequiresFastMemberCaller();
    _;
  }
}
