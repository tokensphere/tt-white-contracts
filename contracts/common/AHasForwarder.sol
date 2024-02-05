// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./lib/LibHasForwarder.sol";
import "../interfaces/ICustomErrors.sol";
import "../interfaces/IERC165.sol"; // Interface Support.

import "@opengsn/contracts/src/forwarder/IForwarder.sol";

/**
 * @title The Forwarder behaviour abstract contract.
 * @notice The AHasForwarder abstract contract is in charge of adding the Forwarder
 *         functionality to any contract inheriting from it.
 */
abstract contract AHasForwarder {
  /// Errors.

  /**
   * @notice Happens when a function is called by a non forwarder manager.
   * @param who is the address that called the function.
   */
  error RequiresForwarderManager(address who);

  /// Events.

  /**
   * @notice Emited when a forwarder is set on an implementing contract.
   * @param forwarderAddress is the address of the trusted forwarder.
   */
  event ForwarderChanged(address forwarderAddress);

  // SEE: https://github.com/opengsn/gsn/blob/v3.0.0-beta.10/packages/contracts/src/ERC2771Recipient.sol

  /**
   * @notice ERC2771Recipient implementation.
   * @param _forwarderAddress the forwarder address.
   * @return bool if the forwarder is trusted.
   */
  function isTrustedForwarder(address _forwarderAddress) public view returns (bool) {
    return _forwarderAddress == LibHasForwarder.data().forwarderAddress;
  }

  /**
   * @notice ERC2771Recipient implementation.
   * @param _forwarderAddress the forwarder address.
   */
  function setTrustedForwarder(address _forwarderAddress) external onlyForwarderManager {
    if (!IERC165(_forwarderAddress).supportsInterface(type(IForwarder).interfaceId))
      revert ICustomErrors.InterfaceNotSupported("IForwarder");

    LibHasForwarder.Data storage ds = LibHasForwarder.data();
    ds.forwarderAddress = _forwarderAddress;

    emit ForwarderChanged(_forwarderAddress);
  }

  /**
   * WARNING: The Forwarder can have a full control over your Recipient. Only trust verified Forwarder.
   * @notice Method is not a required method to allow Recipients to trust multiple Forwarders. Not recommended yet.
   * @return forwarderAddress The address of the Forwarder contract that is being used.
   */
  function getTrustedForwarder() public view virtual returns (address forwarderAddress) {
    return LibHasForwarder.data().forwarderAddress;
  }

  /**
   * @notice Checks whether the given address is a forwarder manager or not.
   * @dev Must be implemented by the inheriting contract.
   * @param who is the address to test.
   */
  function isValidForwarderManager(address who) internal view virtual returns (bool);

  /// Modifiers.

  /// @notice Ensures that a method can only be called by the forwarder manager.
  modifier onlyForwarderManager() virtual {
    if (!isValidForwarderManager(msg.sender)) revert RequiresForwarderManager(msg.sender);
    _;
  }
}
