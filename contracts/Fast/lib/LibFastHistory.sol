// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../interfaces/ISpc.sol';
import '../../interfaces/IExchange.sol';
import '../../interfaces/IFastHistory.sol';


library LibFastHistory {
  struct Data {
    // All minting proofs are kept here.
    IFastHistory.SupplyProof[] supplyProofs;
    // All transfer proofs are kept here.
    IFastHistory.TransferProof[] transferProofs;
    // All transfers IDs involving a given address are kept here.
    mapping(address => uint256[]) transferProofInvolvements;
  }

  function data()
      internal pure returns(Data storage s) {
    bytes32 pos = keccak256("Fast.storage.FastHistory");
    assembly {s.slot := pos}
  }
}
