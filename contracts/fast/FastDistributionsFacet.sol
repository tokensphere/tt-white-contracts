// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import './lib/AFastFacet.sol';
import './FastTopFacet.sol';
import '../lib/LibPaginate.sol';
import './lib/LibFastDistributions.sol';
import './Distribution.sol';
import 'hardhat/console.sol';


// TODO: TEST.
contract FastDistributionsFacet is AFastFacet {
  using LibAddressSet for LibAddressSet.Data;

  function createDistribution(IERC20 token, uint256 total)
      external
      onlyMember(msg.sender) {
    // Deploy a new Distribution contract locked onto the current FAST and target currency token.
    Distribution distribution = new Distribution(
      address(this),
      token,
      msg.sender,
      total,
      FastTopFacet(address(this)).issuerAddress()
    );
    // Register our newly created distribution and keep track of it.
    LibFastDistributions.data().distributionSet.add(address(distribution), false);
    // Emit!
    console.log('Distribution', address(distribution));
    emit DistributionDeployed(distribution);
  }

  /**
   * @notice Queries pages of distributions based on a start index and a page size.
   * @param index is the offset at which the pagination operation should start.
   * @param perPage is how many items should be returned.
   * @return A `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page.
   */
  function paginateDistributions(uint256 index, uint256 perPage)
      external view returns(address[] memory, uint256) {
    return LibPaginate.addresses(
      LibFastDistributions.data().distributionSet.values,
      index,
      perPage
    );
  }
}
