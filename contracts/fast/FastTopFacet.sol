// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../lib/LibHelpers.sol";
import "./lib/AFastFacet.sol";
import "./lib/LibFast.sol";
import "./lib/IFastEvents.sol";
import "./FastFrontendFacet.sol";
import "./FastTokenFacet.sol";

contract FastTopFacet is AFastFacet {
  // Getters and setters for global flags.

  /**
   * @notice Get the Issuer address.
   * @return address Address of Issuer.
   */
  function issuerAddress() external view returns (address) {
    return LibFast.data().issuer;
  }

  /**
   * @notice Get the Marketplace address.
   * @return address Address of Marketplace.
   */
  function marketplaceAddress() external view returns (address) {
    return LibFast.data().marketplace;
  }

  /**
   * @notice Is this FAST a semi public FAST?
   * @return bool Yes/no semi public.
   */
  function isSemiPublic() external view returns (bool) {
    return LibFast.data().isSemiPublic;
  }

  /**
   * @notice Is this FAST a fixed supply FAST?
   * @return bool Yes/no fixed supply.
   */
  function hasFixedSupply() external view returns (bool) {
    return LibFast.data().hasFixedSupply;
  }

  /**
   * @notice Are transfers enabled across this FAST?
   * @return boolean `true` if transfers are disabled, `false` if transfers are enabled.
   */
  function transfersDisabled() external view returns (bool) {
    return LibFast.data().transfersDisabled;
  }

  // Setters for global flags.

  /**
   * @notice Allows to switch from a private scheme to a semi-public scheme,
   *  but not the other way around, unless the total supply is zero.
   * @param flag Set the semi public flag to true/false.
   */
  function setIsSemiPublic(bool flag) external onlyIssuerMember {
    // Someone is trying to toggle back to private?... No can do!
    if (this.isSemiPublic() && FastTokenFacet(address(this)).totalSupply() != 0) {
      revert ICustomErrors.UnsupportedOperation();
    }
    LibFast.data().isSemiPublic = flag;
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  /**
   * @notice Allows an issuer member to enable or disable all transfers within this FAST.
   * @param flag Set the transfer capability to active or not.
   */
  function setTransfersDisabled(bool flag) external onlyIssuerMemberOrIssuerContract {
    LibFast.Data storage d = LibFast.data();
    // Only make changes and emit if the new flag is different than the old one.
    if (d.transfersDisabled != flag) {
      // Set flag.
      d.transfersDisabled = flag;
      // Emit!
      FastFrontendFacet(address(this)).emitDetailsChanged();
    }
  }

  /**
   * @notice Retrieves the group slug to which this FAST belongs.
   * @return string The group slug string.
   */
  function group() external view returns (string memory) {
    return LibFast.data().group;
  }

  /**
   * @notice Assigns the FAST into a group given its slug.
   * It should only be callable by the Issuer contract.
   * @param newGroup is the slug for the new group for this FAST.
   */
  function setGroup(string calldata newGroup) external onlyIssuerContract {
    // Set group slug.
    LibFast.data().group = newGroup;
  }
}
