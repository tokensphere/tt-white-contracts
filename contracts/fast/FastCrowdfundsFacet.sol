// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import './lib/AFastFacet.sol';
import './FastTopFacet.sol';
import '../lib/LibPaginate.sol';
import './lib/LibFastCrowdfunds.sol';
import './Crowdfund.sol';


/**
 * @title The Fast Smart Contract.
 * @notice The Fast Crowdfunds facet is in charge of deploying and keeping track of crowdfunds.
 */
contract FastCrowdfundsFacet is AFastFacet {
  using LibAddressSet for LibAddressSet.Data;

  /**
   * @notice Creates a crowdfund contract.
   * @param token is the address of the ERC20 token that should be collected.
   */
  function createCrowdfund(IERC20 token, address beneficiary, string memory ref)
      external {
    // Deploy a new Crowdfund contract.
    Crowdfund crowdfund = new Crowdfund(
      Crowdfund.Params({
        owner: msg.sender,
        issuer: FastTopFacet(address(this)).issuerAddress(),
        fast: address(this),
        beneficiary: beneficiary,
        token: token,
        ref: ref
      })
    );
    // Register our newly created crowdfund and keep track of it.
    LibFastCrowdfunds.data().crowdfundSet.add(address(crowdfund), false);
    // Emit!
    emit CrowdfundDeployed(crowdfund);
  }

  function removeCrowdfund(Crowdfund crowdfund)
      public onlyIssuerMember {
    LibFastCrowdfunds.data().crowdfundSet.remove(address(crowdfund), false);
    emit CrowdfundRemoved(crowdfund);
  }

  /**
   * @notice Retrieves the number of crowdfunds ever deployed for this FAST.
   * @return An `uint256` for the count.
   */
  function crowdfundCount()
      external view returns(uint256) {
    return LibFastCrowdfunds.data().crowdfundSet.values.length;
  }

  /**
   * @notice Queries pages of crowdfunds based on a start index and a page size.
   * @param index is the offset at which the pagination operation should start.
   * @param perPage is how many items should be returned.
   * @return An `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page.
   */
  function paginateCrowdfunds(uint256 index, uint256 perPage)
      external view returns(address[] memory, uint256) {
    return LibPaginate.addresses(
      LibFastCrowdfunds.data().crowdfundSet.values,
      index,
      perPage
    );
  }
}
