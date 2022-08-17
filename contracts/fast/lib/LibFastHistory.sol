// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;


library LibFastHistory {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Fast.storage.History'):
  bytes32 internal constant STORAGE_SLOT = 0x6bc8b61a9dd5fc049ea98027492a801d74e35fdf4d80d7fecd551a16e88fdbb4;

  // Storage structures.

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    /// @dev All minting proofs are kept here.
    SupplyProof[] supplyProofs;
    /// @dev All transfer proofs are kept here.
    TransferProof[] transferProofs;
    /// @dev All transfers indices involving a given address are kept here.
    mapping(address => uint256[]) transferProofInvolvements;
  }

  // Other structures.

  /// @dev A minting operation could either be to mint or unmint tokens.
  enum SupplyOp { Mint, Burn }

  /// @dev Minting operations are recorded for papertrail. This is the structure that keeps track of them.
  struct SupplyProof {
    SupplyOp op;
    uint256 amount;
    uint256 blockNumber;
    string ref;
  }

  /// @dev Every transfer in is recorded. This is the structure that keeps track of them.
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
    assembly {s.slot := STORAGE_SLOT}
  }
}
