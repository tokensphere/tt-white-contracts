// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../lib/LibPaginate.sol";
import "../common/AHasContext.sol";
import "./lib/AFastFacet.sol";
import "./lib/LibFastDistributions.sol";
import "./FastTopFacet.sol";
import "./Distribution.sol";

/**
 * @title The Fast Smart Contract.
 * @notice The Fast Distributions facet is in charge of deploying and keeping track of distributions.
 */
contract FastDistributionsFacet is AFastFacet, AHasContext {
  using LibAddressSet for LibAddressSet.Data;

  /// @notice Happens when a call to the ERC20 token contract fails.
  error TokenContractError();
  /// @notice Happens when there are insufficient funds somewhere.
  error InsufficientFunds(uint256 amount);

  /// AHasContext implementation.

  function _isTrustedForwarder(address forwarder) internal view override(AHasContext) returns (bool) {
    return AHasForwarder(address(this)).isTrustedForwarder(forwarder);
  }

  // Override base classes to use the AHasContext implementation.
  function _msgSender() internal view override(AHasContext) returns (address) {
    return AHasContext._msgSender();
  }

  /**
   * @notice Creates a distribution contract.
   * @param token is the address of the ERC20 token that should be distributed.
   * @param total is the amount of ERC20 tokens to distribute.
   * @param blockLatch is the block to consider the historical point of truth to calculate the proceeds.
   */
  function createDistribution(
    IERC20 token,
    uint256 total,
    uint256 blockLatch,
    string memory ref
  ) external onlyMember(_msgSender()) {
    // Make sure the current FAST contract has at least `total` allowance over the user's ERC20 tokens.
    uint256 allowance = token.allowance(_msgSender(), address(this));
    if (allowance < total) revert InsufficientFunds(total - allowance);

    // Deploy a new Distribution contract locked onto the current FAST and target currency token.
    Distribution dist = new Distribution(
      Distribution.Params({
        issuer: FastTopFacet(address(this)).issuerAddress(),
        fast: address(this),
        blockLatch: blockLatch,
        distributor: _msgSender(),
        token: token,
        total: total,
        ref: ref
      })
    );
    // Register our newly created distribution and keep track of it.
    LibFastDistributions.data().distributionSet.add(address(dist), false);
    // Transfer the ERC20 tokens to the distribution contract.
    if (!token.transferFrom(_msgSender(), address(dist), total)) revert TokenContractError();
    // Advance to the FeeSetup phase - only the FAST contract can do that.
    dist.advanceToFeeSetup();
    // Emit!
    emit DistributionDeployed(dist);
  }

  function removeDistribution(Distribution distribution) public onlyIssuerMember {
    LibFastDistributions.data().distributionSet.remove(address(distribution), false);
    emit DistributionRemoved(distribution);
  }

  /**
   * @notice Retrieves the number of distributions ever deployed for this FAST.
   * @return An `uint256` for the count.
   */
  function distributionCount() external view returns (uint256) {
    return LibFastDistributions.data().distributionSet.values.length;
  }

  /**
   * @notice Queries pages of distributions based on a start index and a page size.
   * @param index is the offset at which the pagination operation should start.
   * @param perPage is how many items should be returned.
   * @return An `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page.
   */
  function paginateDistributions(uint256 index, uint256 perPage) external view returns (address[] memory, uint256) {
    return LibPaginate.addresses(LibFastDistributions.data().distributionSet.values, index, perPage);
  }
}
