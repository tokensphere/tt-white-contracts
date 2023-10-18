// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./lib/LibPaymaster.sol";
import "./lib/APaymasterFacet.sol";

import "@opengsn/contracts/src/BasePaymaster.sol";

contract PaymasterTopFacet is APaymasterFacet, BasePaymaster {
  bool public useRejectOnRecipientRevert = false;

  // TODO: Do we use the Marketplace at this point to check that the sender is allowed?
  function _preRelayedCall(
    GsnTypes.RelayRequest calldata relayRequest,
    bytes calldata signature,
    bytes calldata approvalData,
    uint256 maxPossibleGas
  ) internal virtual override returns (bytes memory context, bool revertOnRecipientRevert) {
    (signature, maxPossibleGas);
    if (approvalData.length == 0) revert ICustomErrors.InvalidApprovalDataLength();
    if (relayRequest.relayData.paymasterData.length == 0) revert ICustomErrors.InvalidPaymasterDataLength();

    return ("", useRejectOnRecipientRevert);
  }

  function _postRelayedCall(
    bytes calldata context,
    bool success,
    uint256 gasUseWithoutPost,
    GsnTypes.RelayData calldata relayData
  ) internal virtual override {
    (context, success, gasUseWithoutPost, relayData);
  }

  function versionPaymaster() external view virtual override returns (string memory) {
    return "3.0.0-beta.3+opengsn.accepteverything.ipaymaster";
  }
}
