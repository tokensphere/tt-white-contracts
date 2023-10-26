// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.10;

/**
 * Note this is an "unwrapped" version of `BasePaymaster.sol` from the OpenGSN repo.
 * Original license: GPL-3.0-only.
 */

import "./lib/LibPaymaster.sol";
import "./lib/APaymasterFacet.sol";

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import "@opengsn/contracts/src/utils/GsnTypes.sol";
import "@opengsn/contracts/src/interfaces/IPaymaster.sol";
import "@opengsn/contracts/src/interfaces/IRelayHub.sol";
import "@opengsn/contracts/src/utils/GsnEip712Library.sol";
import "@opengsn/contracts/src/forwarder/IForwarder.sol";

// import "hardhat/console.sol";

contract PaymasterTopFacet is IPaymaster {
  using ERC165Checker for address;

  /// Errors.
  // TODO: Move to ICustomErrors?

  error ApprovalDataNotEmpty();
  error ForwarderNotTrusted(address);
  error InterfaceNotSupported(string);
  error RelayHubAddressNotSet();
  error RequiresRelayHubCaller();
  error ValueTransferNotSupported();

  IRelayHub internal relayHub;
  address private _trustedForwarder;

  // SEE: https://docs.opengsn.org/contracts/#delegating-the-prerelayedcall-logic-to-recipient-via-the-rejectonrecipientrevert-flag
  bool public useRejectOnRecipientRevert = false;

  // Overhead of forwarder verify+signature, plus hub overhead.
  uint256 public constant FORWARDER_HUB_OVERHEAD = 50000;

  // These parameters are documented in IPaymaster.GasAndDataLimits.
  // SEE: https://github.com/opengsn/gsn/blob/master/packages/contracts/src/interfaces/IPaymaster.sol#L29C10-L29C10
  uint256 public constant PRE_RELAYED_CALL_GAS_LIMIT = 100000;
  uint256 public constant POST_RELAYED_CALL_GAS_LIMIT = 110000;
  uint256 public constant PAYMASTER_ACCEPTANCE_BUDGET = PRE_RELAYED_CALL_GAS_LIMIT + FORWARDER_HUB_OVERHEAD;
  uint256 public constant CALLDATA_SIZE_LIMIT = 10500;

  /// @inheritdoc IERC165
  // This is being pulled in to to satisfy the IPaymaster interface.
  // I'd like to rip this out and depend on the Diamond's implementation.
  function supportsInterface(bytes4 /*interfaceId*/) public pure override(IERC165) returns (bool) {
    return false;
  }

  /// @inheritdoc IPaymaster
  function getRelayHub() public view override(IPaymaster) returns (address) {
    return address(relayHub);
  }

  /// @inheritdoc IPaymaster
  function getGasAndDataLimits() public pure override(IPaymaster) returns (IPaymaster.GasAndDataLimits memory limits) {
    return
      IPaymaster.GasAndDataLimits(
        PAYMASTER_ACCEPTANCE_BUDGET,
        PRE_RELAYED_CALL_GAS_LIMIT,
        POST_RELAYED_CALL_GAS_LIMIT,
        CALLDATA_SIZE_LIMIT
      );
  }

  /**
   * @notice The owner of the Paymaster can change the instance of the RelayHub this Paymaster works with.
   * :warning: **Warning** :warning: The deposit on the previous RelayHub must be withdrawn first.
   */
  // TODO: Add MODIFIER - ONLY OWNER
  function setRelayHub(IRelayHub hub) public {
    if (!address(hub).supportsInterface(type(IRelayHub).interfaceId)) revert InterfaceNotSupported("IRelayHub");
    relayHub = hub;
  }

  /**
   * @notice The owner of the Paymaster can change the instance of the Forwarder this Paymaster works with.
   * @notice the Recipients must trust this Forwarder as well in order for the configuration to remain functional.
   */
  // TODO: Add MODIFIER - ONLY OWNER
  function setTrustedForwarder(address forwarder) public {
    if (!forwarder.supportsInterface(type(IForwarder).interfaceId)) revert InterfaceNotSupported("IForwarder");
    _trustedForwarder = forwarder;
  }

  function getTrustedForwarder() public view override returns (address) {
    return _trustedForwarder;
  }

  /**
   * @notice Any native Ether/MATIC transferred into the paymaster is transferred as a deposit to the RelayHub.
   * This way, we don't need to understand the RelayHub API in order to replenish the paymaster.
   */
  receive() external payable {
    if (address(relayHub) == address(0)) revert RelayHubAddressNotSet();
    relayHub.depositFor{value: msg.value}(address(this));
  }

  /**
   * @notice Withdraw deposit from the RelayHub.
   * @param amount The amount to be subtracted from the sender.
   * @param target The target to which the amount will be transferred.
   */
  // TODO: Add MODIFIER - ONLY OWNER
  function withdrawRelayHubDepositTo(uint256 amount, address payable target) public {
    relayHub.withdraw(target, amount);
  }

  /// @inheritdoc IPaymaster
  function preRelayedCall(
    GsnTypes.RelayRequest calldata relayRequest,
    bytes calldata /* signature */,
    bytes calldata approvalData,
    uint256 /* maxPossibleGas */
  ) external view override(IPaymaster) verifyRelayHubOnly returns (bytes memory, bool) {
    /**
     * This method must be called from preRelayedCall to validate that the forwarder
     * is approved by the paymaster as well as by the recipient contract.
     */

    if (getTrustedForwarder() != relayRequest.relayData.forwarder)
      revert ForwarderNotTrusted(relayRequest.relayData.forwarder);
    // TODO: Check what this calls...
    GsnEip712Library.verifyForwarderTrusted(relayRequest);

    if (relayRequest.request.value != 0) revert ValueTransferNotSupported();
    if (relayRequest.relayData.paymasterData.length != 0) revert ICustomErrors.InvalidPaymasterDataLength();
    if (approvalData.length != 0) revert ApprovalDataNotEmpty();

    /**
     * Internal logic the paymasters need to provide to select which transactions they are willing to pay for
     * see the documentation for `IPaymaster::preRelayedCall` for details
     */
    if (approvalData.length == 0) revert ICustomErrors.InvalidApprovalDataLength();
    if (relayRequest.relayData.paymasterData.length == 0) revert ICustomErrors.InvalidPaymasterDataLength();

    return ("", useRejectOnRecipientRevert);
  }

  /// @inheritdoc IPaymaster
  function postRelayedCall(
    bytes calldata context,
    bool success,
    uint256 gasUseWithoutPost,
    GsnTypes.RelayData calldata relayData
  ) external view override(IPaymaster) verifyRelayHubOnly {
    /**
     * Internal logic the paymasters need to provide if they need to take some action after the transaction
     * see the documentation for `IPaymaster::postRelayedCall` for details
     */
    (context, success, gasUseWithoutPost, relayData);
  }

  function versionPaymaster() external pure override(IPaymaster) returns (string memory) {
    return "3.0.0-beta.9+opengsn.tokensphere.ipaymaster";
  }

  /// Modifiers.

  modifier verifyRelayHubOnly() virtual {
    if (msg.sender != getRelayHub()) revert RequiresRelayHubCaller();
    _;
  }
}
