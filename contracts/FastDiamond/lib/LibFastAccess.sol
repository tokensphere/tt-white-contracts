// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibAddressSet.sol';


library LibFastAccess {
  struct Data {
    // Governors.
    LibAddressSet.Data governorSet;
    // Members.
    LibAddressSet.Data memberSet;
  }

  function data()
      internal pure returns(Data storage s) {
    bytes32 pos = keccak256("FastDiamond.storage.FastAccess");
    assembly {s.slot := pos}
  }
}
