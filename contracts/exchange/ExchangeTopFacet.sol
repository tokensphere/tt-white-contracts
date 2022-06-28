// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import '../spc/SpcTopFacet.sol';
import './lib/LibExchange.sol';
import '../interfaces/IHasMembers.sol';
import './lib/AExchangeFacet.sol';


/** @title The Exchange Smart Contract.
 *  @dev The Exchange Top facet is in charge of keeping track of common parameters and provides
 *        generic functionality.
 */
contract ExchangeTopFacet is AExchangeFacet {
  // Getters.

  function spcAddress()
    external view returns(address) {
      return LibExchange.data().spc;
  }
}
