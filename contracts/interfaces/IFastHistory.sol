// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


interface IFastHistory {
  /// Data structures.

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

  /// Functions.
  function minted(uint256 amount, string memory ref) external;
  function burnt(uint256 amount, string memory ref) external;
  function transfered(address spender, address from, address to, uint256 amount, string memory ref) external;
}
