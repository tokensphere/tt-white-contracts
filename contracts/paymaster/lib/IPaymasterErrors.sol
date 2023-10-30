// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

/**
 * @notice Errors that can occur within the paymaster.
 */
interface IPaymasterErrors {
  error ForwarderNotTrusted(address);
  error InvalidPaymasterDataLength();
  error InvalidApprovalDataLength();
  error RelayHubAddressNotSet();
  error RequiresRelayHubCaller();
  error ValueTransferNotSupported();
}
