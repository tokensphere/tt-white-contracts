// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


/** @notice This library centralises shared functionality between FAST diamonds facets that have to do with transfer
 * history tracking.
 * @dev Note that if you feel like a function should be created inside this library, you might want to really consider
 * whether or not it is the right place for it. Any facet using a function from internal libraries see their bytecode
 * size increase, kind of defeating the benefits of using facets in the first place. So please keep it reasonable. 
 */
library LibFastHistory {
  /// @notice The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  /// @notice This is keccak256('Fast.storage.History'):
  bytes32 internal constant STORAGE_SLOT = 0x6bc8b61a9dd5fc049ea98027492a801d74e35fdf4d80d7fecd551a16e88fdbb4;

  // Storage structures.

  /** @notice The history data structure required for operating any given FAST diamond.
   * @dev The `version` field is used to ensure that storage is at a known version during upgrades.
   */
  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    /// @notice All minting proofs are kept here.
    SupplyProof[] supplyProofs;
    /// @notice All transfer proofs are kept here.
    TransferProof[] transferProofs;
    /// @notice All transfers indices involving a given address are kept here.
    mapping(address => uint256[]) transferProofInvolvements;
  }

  // Other structures.

  /// @notice A minting operation could either be to mint or burn tokens.
  enum SupplyOp { Mint, Burn }

  /// @notice Minting operations are recorded for papertrail. This is the structure that keeps track of them.
  struct SupplyProof {
    /// @notice How...
    SupplyOp op;
    /// @notice How much...
    uint256 amount;
    /// @notice When...
    uint256 blockNumber;
    /// @notice Why...
    string ref;
  }

  /// @notice Every transfer in is recorded. This is the structure that keeps track of them.
  struct TransferProof {
    /// @notice Who spent...
    address spender;
    /// @notice Who performed the transfer...
    address from;
    /// @notice Who received...
    address to;
    /// @notice How much...
    uint256 amount;
    /// @notice When...
    uint256 blockNumber;
    /// @notice Why...
    string ref;
  }

  /** @notice Returns the history storage for the calling FAST.
   * @return s a struct pointer for history FAST data storage.
   */
  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
