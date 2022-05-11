// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


interface IFastHistory {
  /// Data structures.

  // Minting operations are recorded for papertrail. This is the
  // structure that keeps track of them.
  struct MintingProof {
    uint256 amount;
    uint256 blockNumber;
    string ref;
  }

  // Every transfer in is recorded. This is the structure that keeps
  // track of them.
  struct TransferProof {
    address from;
    address spender;
    address to;
    uint256 amount;
    uint256 blockNumber;
    string ref;
  }

  /// Functions.
  function addMintingProof(uint256 amount, string memory ref) external;
  function addTransferProof(address spender, address from, address to, uint256 amount, string memory ref) external;
}
