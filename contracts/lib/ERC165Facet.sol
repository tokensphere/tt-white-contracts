// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../lib/LibDiamond.sol';
import '../interfaces/IERC165.sol';

contract ERC165Facet is IERC165 {
  function supportsInterface(bytes4 interfaceId)
      external view override returns(bool) {
    return LibDiamond.diamondStorage().supportedInterfaces[interfaceId];
  }
}
