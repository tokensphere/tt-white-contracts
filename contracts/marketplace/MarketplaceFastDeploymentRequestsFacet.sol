// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./lib/AMarketplaceFacet.sol";
import "./lib/LibMarketplaceFastDeploymentRequests.sol";

/**
 * @title The Marketplace Smart Contract.
 * @notice The Marketplace Fast Deployments facet is in charge of keeping track of requested Fast Deployments.
 */
contract MarketplaceFastDeploymentRequestsFacet is AMarketplaceFacet {
  /**
   * @notice Allows querying the current price for a FAST deployment request.
   * @return An uint256 representing the price for a FAST deployment request.
   */
  function fastDeploymentRequestPrice() external view returns (uint256) {
    return LibRequestedFastDeployments.data().price;
  }

  /**
   * @notice This function allows an issuer member to change the price of a FAST deployment request.
   * @param newPrice The new price of a FAST deployment request.
   */
  function setFastDeploymentRequestPrice(uint256 newPrice) external onlyIssuerMember {
    // Grab a pointer to our storage slot.
    LibRequestedFastDeployments.Data storage data = LibRequestedFastDeployments.data();
    // Set the new price.
    data.price = newPrice;
  }

  /**
   * @notice This function returns the number of FAST deployment requests ever made.
   * @return An uint256 representing the number of FAST deployment requests ever made.
   */
  function fastDeploymentRequestsCount() external view returns (uint256) {
    return LibRequestedFastDeployments.data().requests.length;
  }

  /**
   * @notice This function allows to get previously made FAST deployment requests.
   * @param index is the index at which to retrieve the request.
   */
  function fastDeploymentRequest(uint256 index) external view returns (LibRequestedFastDeployments.Request memory) {
    // Grab a pointer to our storage slot.
    LibRequestedFastDeployments.Data storage data = LibRequestedFastDeployments.data();
    // Out of bounds.
    if (index >= data.requests.length) revert ICustomErrors.OutOfBounds();
    // Return the request.
    return data.requests[index];
  }

  /**
   * @notice This function allows users to request a FAST deployment.
   * @param params The parameters for the FAST deployment.
   */
  function requestDeployment(string memory params) external payable onlyMember(msg.sender) {
    // Grab a pointer to our storage slot.
    LibRequestedFastDeployments.Data storage data = LibRequestedFastDeployments.data();
    // Not enough attached Eth.
    if (msg.value < data.price) revert ICustomErrors.InsufficientFunds(data.price - msg.value);
    // Too much attached Eth.
    else if (msg.value > data.price) revert ICustomErrors.Overfunded(msg.value - data.price);
    // Emit!
    emit FastDeploymentRequested(data.requests.length);
    // Enqueue the request.
    data.requests.push(LibRequestedFastDeployments.Request({sender: msg.sender, paid: data.price, params: params}));
  }
}
