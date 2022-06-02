// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../Exchange.sol';


library LibFastHistory {
  /// Storage structure.
  struct Data {
    // All minting proofs are kept here.
    SupplyProof[] supplyProofs;
    // All transfer proofs are kept here.
    TransferProof[] transferProofs;
    // All transfers IDs involving a given address are kept here.
    mapping(address => uint256[]) transferProofInvolvements;
  }

  /// Other structures.

  // A minting operation could either be to mint or unmint tokens.
  enum SupplyOp { Mint, Burn }

  // Minting operations are recorded for papertrail. This is the
  // structure that keeps track of them.
  struct SupplyProof {
    SupplyOp op;
    uint256 amount;
    uint256 blockNumber;
    string ref;
  }

  // Every transfer in is recorded. This is the structure that keeps
  // track of them.
  struct TransferProof {
    address spender;
    address from;
    address to;
    uint256 amount;
    uint256 blockNumber;
    string ref;
  }

  function data()
      internal pure returns(Data storage s) {
    bytes32 pos = keccak256("Fast.storage.FastHistory");
    assembly {s.slot := pos}
  }
}
