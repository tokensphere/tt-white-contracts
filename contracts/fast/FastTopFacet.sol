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

  // Setters for global flags.

  /**
   * @notice Allows to switch from a private scheme to a semi-public scheme,
   *  but not the other way around.
   * @param flag Set the semi public flag to true/false.
   */
  function setIsSemiPublic(bool flag)
      external
      onlyIssuerMember {
    LibFast.Data storage s = LibFast.data();
    // Someone is trying to toggle back to private?... No can do!
    require(!this.isSemiPublic() || this.isSemiPublic() == flag, LibConstants.UNSUPPORTED_OPERATION);
    s.isSemiPublic = flag;
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }
}
