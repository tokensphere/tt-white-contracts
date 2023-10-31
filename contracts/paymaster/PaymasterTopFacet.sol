// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.10;

import "../common/AHasMembers.sol";
import "../interfaces/ICustomErrors.sol";
import "../lib/LibDiamond.sol";
import "./lib/APaymasterFacet.sol";
import "./lib/IPaymasterErrors.sol";

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import "@opengsn/contracts/src/utils/GsnTypes.sol";
import "@opengsn/contracts/src/interfaces/IPaymaster.sol";
import "@opengsn/contracts/src/interfaces/IRelayHub.sol";
import "@opengsn/contracts/src/utils/GsnEip712Library.sol";
import "@opengsn/contracts/src/forwarder/IForwarder.sol";

/**
 * @notice The top-level Paymaster contract.
 * Note this is an "unwrapped" version of `BasePaymaster.sol` from the OpenGSN repo.
 * Original license: GPL-3.0-only.
 */
contract PaymasterTopFacet is APaymasterFacet, IPaymaster {
  /// Top level state variables.

  IRelayHub internal relayHub;
  address private trustedForwarder;

  // SEE: https://docs.opengsn.org/contracts/#delegating-the-prerelayedcall-logic-to-recipient-via-the-rejectonrecipientrevert-flag
  bool public useRejectOnRecipientRevert = false;

  // These parameters are documented in IPaymaster.GasAndDataLimits.
  // SEE: https://github.com/opengsn/gsn/blob/v3.0.0-beta.10/packages/contracts/src/interfaces/IPaymaster.sol#L29

  // Overhead of forwarder verify+signature, plus hub overhead.
  uint256 public constant FORWARDER_HUB_OVERHEAD = 50000;
  uint256 public constant PRE_RELAYED_CALL_GAS_LIMIT = 100000;
  uint256 public constant POST_RELAYED_CALL_GAS_LIMIT = 110000;
  uint256 public constant PAYMASTER_ACCEPTANCE_BUDGET = PRE_RELAYED_CALL_GAS_LIMIT + FORWARDER_HUB_OVERHEAD;
  uint256 public constant CALLDATA_SIZE_LIMIT = 10500;

  // This is being pulled in to to satisfy the IPaymaster interface.
  // TODO: I'd like to remove this and depend on the Diamond's implementation.
  /// @inheritdoc IERC165
  function supportsInterface(bytes4 _interfaceId) public view override(IERC165) returns (bool) {
    LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    return ds.supportedInterfaces[_interfaceId];
  }

  /// @inheritdoc IPaymaster
  function getRelayHub() public view override(IPaymaster) returns (address) {
    return address(relayHub);
  }

  /// @inheritdoc IPaymaster
  function getTrustedForwarder() public view override(IPaymaster) returns (address) {
    return trustedForwarder;
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

  /// @inheritdoc IPaymaster
  function preRelayedCall(
    GsnTypes.RelayRequest calldata relayRequest,
    bytes calldata /* signature */,
    bytes calldata approvalData,
    uint256 /* maxPossibleGas */
  ) external view override(IPaymaster) onlyRelayHub returns (bytes memory, bool) {
    if (getTrustedForwarder() != relayRequest.relayData.forwarder)
      revert IPaymasterErrors.ForwarderNotTrusted(relayRequest.relayData.forwarder);

    // SEE: https://github.com/opengsn/gsn/blob/v3.0.0-beta.10/packages/contracts/src/utils/GsnEip712Library.sol#L59
    GsnEip712Library.verifyForwarderTrusted(relayRequest);

    if (relayRequest.request.value != 0) revert IPaymasterErrors.ValueTransferNotSupported();
    if (relayRequest.relayData.paymasterData.length != 0) revert IPaymasterErrors.InvalidPaymasterDataLength();
    if (approvalData.length != 0) revert IPaymasterErrors.InvalidApprovalDataLength();

    // /=-@=-@=-@=-@=-@=-@=-@=-@=-@=-@=-@=-@=-@=-@/

    // Check for marketplace membership.
    LibPaymaster.Data storage s = LibPaymaster.data();
    if (!AHasMembers(s.marketplace).isMember(relayRequest.request.from))
      revert ICustomErrors.RequiresMarketplaceMembership(relayRequest.request.from);

    // /~@^~@^~@^~@^~@^~@^~@^~@^~@^~@^~@^~@^~@^~@^/

    // See the documentation for `IPaymaster::preRelayedCall` for details.
    return ("", useRejectOnRecipientRevert);
  }

  /// @inheritdoc IPaymaster
  function postRelayedCall(
    bytes calldata context,
    bool success,
    uint256 gasUseWithoutPost,
    GsnTypes.RelayData calldata relayData
  ) external view override(IPaymaster) onlyRelayHub {
    // See the documentation for `IPaymaster::postRelayedCall` for details.
    (context, success, gasUseWithoutPost, relayData);
  }

  /// @inheritdoc IPaymaster
  function versionPaymaster() external pure override(IPaymaster) returns (string memory) {
    return "3.0.0-beta.10+opengsn.tokensphere.ipaymaster";
  }

  /// Setters and utility methods.

  /**
   * @notice The owner of the Paymaster can change the instance of the RelayHub this Paymaster works with.
   *         **Warning** The deposit on the previous RelayHub must be withdrawn first.
   * @param hub The address of the new RelayHub.
   */
  function setRelayHub(IRelayHub hub) public onlyIssuerMember {
    if (!IERC165(address(hub)).supportsInterface(type(IRelayHub).interfaceId))
      revert ICustomErrors.InterfaceNotSupported("IRelayHub");
    relayHub = hub;
  }

  /**
   * @notice The owner of the Paymaster can change the instance of the Forwarder this Paymaster works with.
   *         the Recipients must trust this Forwarder as well in order for the configuration to remain functional.
   * @param forwarder The address of the new Forwarder.
   */
  function setTrustedForwarder(address forwarder) public onlyIssuerMember {
    if (!IERC165(forwarder).supportsInterface(type(IForwarder).interfaceId))
      revert ICustomErrors.InterfaceNotSupported("IForwarder");
    trustedForwarder = forwarder;
  }

  /**
   * @notice Deposit Ether/MATIC on behalf of the Paymaster to the RelayHub.
   */
  function deposit() external payable {
    if (address(relayHub) == address(0)) revert IPaymasterErrors.RelayHubAddressNotSet();
    relayHub.depositFor{value: msg.value}(address(this));
  }

  /**
   * @notice Withdraw deposit from the RelayHub.
   * @param amount The amount to be subtracted from the sender.
   * @param target The target to which the amount will be transferred.
   */
  function withdrawRelayHubDepositTo(uint256 amount, address payable target) public onlyIssuerMember {
    relayHub.withdraw(target, amount);
  }

  /// Modifiers.

  /// @notice Ensures that a method can only be called by the RelayHub.
  modifier onlyRelayHub() {
    if (msg.sender != getRelayHub()) revert IPaymasterErrors.RequiresRelayHubCaller();
    _;
  }

  // TODO: Check this.
  /// @notice Ensures that a method can only be called by an Issuer.
  modifier onlyIssuerMember() {
    LibPaymaster.Data storage s = LibPaymaster.data();
    if (!AHasMembers(s.issuer).isMember(msg.sender)) revert ICustomErrors.RequiresIssuerMemberCaller();
    _;
  }
}
