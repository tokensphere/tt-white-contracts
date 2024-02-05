// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

/**
 * @title The Context behaviour abstract contract.
 * @notice The AHasContext abstract contract is in charge of adding the required
 *         base implementation of ERC-2771 - see: https://eips.ethereum.org/EIPS/eip-2771
 *         the key difference is that `isTrustedForwarder` becomes an internal method.
 */
abstract contract AHasContext {
  /// @dev Must be implemented by the inheriting contract.
  function _isTrustedForwarder(address forwarder) internal view virtual returns (bool);

  // The following is copied from:
  // https://github.com/opengsn/gsn/blob/v3.0.0-beta.10/packages/contracts/src/ERC2771Recipient.sol
  // With a slight change to call `_isTrustedForwarder` instead of `isTrustedForwarder`.

  /// @notice Default implemention.
  function _msgSender() internal view virtual returns (address ret) {
    if (msg.data.length >= 20 && _isTrustedForwarder(msg.sender)) {
      // At this point we know that the sender is a trusted forwarder,
      // so we trust that the last bytes of msg.data are the verified sender address.
      // extract sender address from the end of msg.data
      assembly {
        ret := shr(96, calldataload(sub(calldatasize(), 20)))
      }
    } else {
      ret = msg.sender;
    }
    return ret;
  }

  /// @notice Default implemention.
  function _msgData() internal view virtual returns (bytes calldata ret) {
    if (msg.data.length >= 20 && _isTrustedForwarder(msg.sender)) {
      return msg.data[0:msg.data.length - 20];
    } else {
      return msg.data;
    }
  }
}
