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

  function issuerAddress()
      external view returns(address) {
    return LibFast.data().issuer;
  }

  function marketplaceAddress()
      external view returns(address) {
    return LibFast.data().marketplace;
  }

  function isSemiPublic()
      external view returns(bool) {
    return LibFast.data().isSemiPublic;
  }

  function hasFixedSupply()
      external view returns(bool) {
    return LibFast.data().hasFixedSupply;
  }

  // Setters for global flags.

  /// @notice Allows to switch from a private scheme to a semi-public scheme, but not the other way around.
  function setIsSemiPublic(bool flag)
      external
      onlyIssuerMember {
    LibFast.Data storage s = LibFast.data();
    // Someone is trying to toggle back to private?... No can do!isSemiPublic
    require(!this.isSemiPublic() || this.isSemiPublic() == flag, LibConstants.UNSUPPORTED_OPERATION);
    s.isSemiPublic = flag;
    // Emit!
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }
}
