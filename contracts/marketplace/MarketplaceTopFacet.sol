// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../lib/LibAddressSet.sol";
import "../lib/LibPaginate.sol";
import "../common/AHasContext.sol";
import "../common/AHasForwarder.sol";
import "../issuer/IssuerTopFacet.sol";
import "./lib/LibMarketplace.sol";
import "./lib/AMarketplaceFacet.sol";

/**
 * @title The Marketplace Smart Contract.
 * @notice The Marketplace Top facet is in charge of keeping track of common parameters and provides
 * generic functionality.
 */
contract MarketplaceTopFacet is AMarketplaceFacet, AHasContext {

  /// AHasContext implementation.

  function _isTrustedForwarder(address forwarder) internal view override(AHasContext) returns (bool) {
    return AHasForwarder(address(this)).isTrustedForwarder(forwarder);
  }

  // Getters.

  /**
   * @dev This function returns the address of the Issuer contract that this Marketplace contract should honour.
   * @return address of the issuer.
   */
  function issuerAddress() external view returns (address) {
    return LibMarketplace.data().issuer;
  }

  /**
   * @dev This function allows for an issuer member to obtain Eth stored in the Marketplace contract.
   * @param amount is an uint256.
   */
  function withdrawEth(uint256 amount) external onlyIssuerMember {
    address payable receiver = payable(_msgSender());
    receiver.transfer(amount);
  }
}
