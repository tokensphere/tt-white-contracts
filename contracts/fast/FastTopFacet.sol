// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibConstants.sol';
import '../lib/LibHelpers.sol';
import './lib/AFastFacet.sol';
import './lib/LibFast.sol';
import './lib/IFastEvents.sol';
import './FastFrontendFacet.sol';

contract FastTopFacet is AFastFacet {
  // Getters and setters for global flags.

  /**
   * @notice Get the Issuer address.
   * @return Address of Issuer.
   */
  function issuerAddress()
      external view returns(address) {
    return LibFast.data().issuer;
  }

  /**
   * @notice Get the Marketplace address.
   * @return address Address of Marketplace.
   */
  function marketplaceAddress()
      external view returns(address) {
    return LibFast.data().marketplace;
  }

  /**
   * @notice Is this FAST a semi public FAST?
   * @return bool Yes/no semi public.
   */
  function isSemiPublic()
      external view returns(bool) {
    return LibFast.data().isSemiPublic;
  }

  /**
   * @notice Is this FAST a fixed supply FAST?
   * @return bool Yes/no fixed supply.
   */
  function hasFixedSupply()
      external view returns(bool) {
    return LibFast.data().hasFixedSupply;
  }

  /**
   * @notice Are transfers enabled across this FAST?
   * @return `true` if transfers are disabled, `false` if transfers are enabled.
   */
  function transfersDisabled()
      external view returns(bool) {
    return LibFast.data().transfersDisabled;
  }

  // Setters for global flags.

  /**
   * @notice Allows to switch from a private scheme to a semi-public scheme,
   *  but not the other way around.
   * @param flag Set the semi public flag to true/false.
   */
  function setIsSemiPublic(bool flag)
      external
      onlyIssuerMember {
    // Someone is trying to toggle back to private?... No can do!
    if (this.isSemiPublic()) {
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
  function setTransfersDisabled(bool flag)
      external
      onlyIssuerMember {
    LibFast.data().transfersDisabled = flag;
  }
}
