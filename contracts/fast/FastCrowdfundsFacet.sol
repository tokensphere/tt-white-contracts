// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../lib/LibPaginate.sol";
import "../common/AHasContext.sol";
import "../interfaces/ICustomErrors.sol";
import "../issuer/IssuerAutomatonsFacet.sol";
import "./lib/AFastFacet.sol";
import "./lib/LibFastCrowdfunds.sol";
import "./FastTopFacet.sol";
import "./Crowdfund.sol";

/**
 * @title The Fast Smart Contract.
 * @notice The Fast Crowdfunds facet is in charge of deploying and keeping track of crowdfunds.
 */
contract FastCrowdfundsFacet is AFastFacet, AHasContext {
  using LibAddressSet for LibAddressSet.Data;

  /// @notice Happens when there are insufficient funds somewhere.
  error RequiresPrivilege(address who, uint32 privilege);

  /// AHasContext implementation.

  function _isTrustedForwarder(address forwarder) internal view override(AHasContext) returns (bool) {
    return AHasForwarder(address(this)).isTrustedForwarder(forwarder);
  }

  // Override base classes to use the AHasContext implementation.
  function _msgSender() internal view override(AHasContext) returns (address) {
    return AHasContext._msgSender();
  }

  /**
   * @notice Creates a crowdfund contract.
   * @param token is the address of the ERC20 token that should be collected.
   * @param beneficiary is the address that will receive the funds.
   * @param ref is a reference for the crowdfund.
   * @param cap is the maximum amount of pleged tokens that can be collected.
   */
  function createCrowdfund(
    IERC20 token,
    address beneficiary,
    string memory ref,
    uint256 cap
  ) external onlyGovernor(_msgSender()) {
    address issuer = FastTopFacet(address(this)).issuerAddress();
    // Deploy a new Crowdfund contract.
    Crowdfund crowdfund = new Crowdfund(
      Crowdfund.Params({
        owner: _msgSender(),
        issuer: issuer,
        fast: address(this),
        beneficiary: beneficiary,
        basisPointsFee: LibFastCrowdfunds.data().crowdfundsDefaultBasisPointsFee,
        token: token,
        ref: ref,
        cap: cap
      })
    );
    // Register our newly created crowdfund and keep track of it.
    LibFastCrowdfunds.data().crowdfundSet.add(address(crowdfund), false);
    // Emit!
    emit CrowdfundDeployed(crowdfund);
  }

  function crowdfundsDefaultBasisPointFee() external view returns (uint32) {
    return LibFastCrowdfunds.data().crowdfundsDefaultBasisPointsFee;
  }

  function setCrowdfundsDefaultBasisPointFee(uint32 newBasisPointFee) external onlyIssuerMember {
    uint32 currentFee = LibFastCrowdfunds.data().crowdfundsDefaultBasisPointsFee;
    if (currentFee == newBasisPointFee || newBasisPointFee > 100_00)
      revert ICustomErrors.InvalidCrowdfundBasisPointsFee(newBasisPointFee);
    LibFastCrowdfunds.data().crowdfundsDefaultBasisPointsFee = newBasisPointFee;
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  /**
   * @notice Removes a CrowdFund contract from this FAST.
   * @param crowdfund the address of the CrowdFund contract to remove.
   */
  function removeCrowdfund(Crowdfund crowdfund) public onlyIssuerMember {
    LibFastCrowdfunds.data().crowdfundSet.remove(address(crowdfund), false);
    emit CrowdfundRemoved(crowdfund);
  }

  /**
   * @notice Retrieves the number of crowdfunds ever deployed for this FAST.
   * @return An `uint256` for the count.
   */
  function crowdfundCount() external view returns (uint256) {
    return LibFastCrowdfunds.data().crowdfundSet.values.length;
  }

  /**
   * @notice Queries pages of crowdfunds based on a start index and a page size.
   * @param index is the offset at which the pagination operation should start.
   * @param perPage is how many items should be returned.
   * @return An `(address[], uint256)` tuple, which first item is the list of addresses and the second item a cursor to the next page.
   */
  function paginateCrowdfunds(uint256 index, uint256 perPage) external view returns (address[] memory, uint256) {
    return LibPaginate.addresses(LibFastCrowdfunds.data().crowdfundSet.values, index, perPage);
  }
}
