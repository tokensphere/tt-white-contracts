// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibAddressSet.sol';

library LibFastAccess {
  // These are from IHasMembers.
  event MemberAdded(address indexed member);
  event MemberRemoved(address indexed member);
  // These are from IHasGovernors.
  event GovernorAdded(address indexed governor);
  event GovernorRemoved(address indexed governor);

  struct Data {
    // Governors.
    LibAddressSet.Data governorSet;
    // Members.
    LibAddressSet.Data memberSet;
  }

  function data()
      internal pure returns(Data storage s) {
    bytes32 pos = keccak256('Fast.storage.FastAccess');
    assembly {s.slot := pos}
  }
}
