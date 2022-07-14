// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../lib/LibConstants.sol';
import '../lib/LibHelpers.sol';
import './lib/AFastFacet.sol';
import './lib/LibFast.sol';
import './lib/IFastEvents.sol';
import './FastFrontendFacet.sol';

contract FastTopFacet is AFastFacet {
  // Getters and setters for global flags.

  function spcAddress()
      external view returns(address) {
    return LibFast.data().spc;
  }

  function exchangeAddress()
      external view returns(address) {
    return LibFast.data().exchange;
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

  /// @dev Allows to switch from a private scheme to a semi-public scheme, but not the other way around.
  function setIsSemiPublic(bool flag)
      external
      onlySpcMember {
    LibFast.Data storage s = LibFast.data();
    // Someone is trying to toggle back to private?... No can do!isSemiPublic
    require(!this.isSemiPublic() || this.isSemiPublic() == flag, LibConstants.UNSUPPORTED_OPERATION);
    s.isSemiPublic = flag;
  }

  // Provisioning functions.

  function provisionWithEth()
      external payable {
    require(msg.value > 0, LibConstants.MISSING_ATTACHED_ETH);
    emit EthReceived(msg.sender, msg.value);
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  function drainEth()
      onlySpcMember nonContract(msg.sender)
      external {
    uint256 amount = payable(address(this)).balance;
    payable(msg.sender).transfer(amount);
    emit EthDrained(msg.sender, amount);
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }

  /**
  * @dev This function allows contracts of the FAST network to request ETH
  * provisioning to arbitrary addresses.
  */
  function payUpTo(address payable recipient, uint256 amount)
      nonContract(recipient)
      external onlyDiamondFacet {
    require(
      recipient != address(0),
      LibConstants.REQUIRES_NON_ZERO_ADDRESS
    );
    amount = LibHelpers.upTo(recipient, amount);
    // Transfer some eth!
    if (amount != 0) { recipient.transfer(amount); }
    FastFrontendFacet(address(this)).emitDetailsChanged();
  }
}
