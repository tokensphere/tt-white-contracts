// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibPaginate.sol';
import './lib/AFastFacet.sol';
import './lib/LibFastHistory.sol';


/**
 * @notice Although past events could be scrapped from the chain, we want to
 * the frontend to be capable of listing past transfers and minting / burning events.
 * This facet is in charge of performing archival of these things.
 */
contract FastHistoryFacet is AFastFacet {
  /// Minting history-keeping methods.

  /**
   * @notice This method is a callback for other facets to signal whenever new tokens are minted.
   * @dev Business logic:
   * - Requires that the caller must be another facet.
   * - Adds a supply proof item of type `LibFastHistory.SupplyOp.Mint` on top of the stack.
   */
  function minted(uint256 amount, string calldata ref)
      external onlyDiamondFacet() {
    // Keep track of the mint.
    LibFastHistory.data().supplyProofs.push(
      LibFastHistory.SupplyProof({
        op: LibFastHistory.SupplyOp.Mint,
        amount: amount,
        blockNumber: block.number,
        ref: ref
      })
    );
  }

  /**
   * @notice This method is a callback for other facets to signal whenever new tokens are burnt.
   * @dev Business logic:
   * - Requires that the caller must be another facet.
   * - Adds a supply proof item of type `LibFastHistory.SupplyOp.Burn` on top of the stack.
   */
  function burnt(uint256 amount, string calldata ref)
      external onlyDiamondFacet() {
    // Keep track of the unmint.
    LibFastHistory.data().supplyProofs.push(
      LibFastHistory.SupplyProof({
        op: LibFastHistory.SupplyOp.Burn,
        amount: amount,
        blockNumber: block.number,
        ref: ref
      })
    );
  }

  /**
   * @notice Returns the number of supply proofs (minting and burning together) ever created.
   * @return A `uint256`.
   */
  function supplyProofCount()
      external view returns(uint256) {
    return LibFastHistory.data().supplyProofs.length;
  }

  /**
   * @notice Returns a page of supply proofs (minting and burning together).
   * @param cursor is the zero-based index where to start fetching records.
   * @param perPage is the number of items to return.
   * @return A `(LibFastHistory.SupplyProof[], uint256)` tuple containing a page of data and the cursor to the next page.
   */
  function paginateSupplyProofs(uint256 cursor, uint256 perPage)
      external view returns(LibFastHistory.SupplyProof[] memory, uint256) {
    return LibPaginate.supplyProofs(LibFastHistory.data().supplyProofs, cursor, perPage);
  }

  /// Transfer history-keeping methods.

  /**
   * @notice This method is a callback for other facets to signal whenever a transfer has completed successfuly.
   * @dev Business logic:
   * - Requires that the caller must be another facet.
   * - Keeps track of the operation in various tracking structures, so that it can be queried later by `sender` and `recipient`.
   * - Pushes a transfer proof to the main transfer proof tracking stack.
   */
  function transfered(address spender, address from, address to, uint256 amount, string calldata ref)
      external onlyDiamondFacet() {
    LibFastHistory.Data storage s = LibFastHistory.data();
    // Keep track of the transfer proof ID for the sender and for the recipient.
    s.transferProofInvolvements[from].push(s.transferProofs.length);
    s.transferProofInvolvements[to].push(s.transferProofs.length);
    // Keep track of the transfer proof globally.
    s.transferProofs.push(
      LibFastHistory.TransferProof({
        spender: spender,
        from: from,
        to: to,
        amount: amount,
        blockNumber: block.number,
        ref: ref
      })
    );
  }

  /**
   * @notice Returns the number of transfer proofs ever created.
   * @return A `uint256`.
   */
  function transferProofCount()
      external view returns(uint256) {
    return LibFastHistory.data().transferProofs.length;
  }

  /**
   * @notice Returns a page of transfer proofs.
   * @param cursor is the zero-based index where to start fetching records.
   * @param perPage is the number of items to return.
   * @return A `(LibFastHistory.TransferProof[], uint256)` tuple containing a page of data and the cursor to the next page.
   */
  function paginateTransferProofs(uint256 cursor, uint256 perPage)
      external view returns(LibFastHistory.TransferProof[] memory, uint256) {
    return LibPaginate.transferProofs(LibFastHistory.data().transferProofs, cursor, perPage);
  }

  /**
   * @notice Counts all past inbound and outbound transfers involving a given address.
   * @param involvee is the address for which to get the transfer proofs.
   */
  function transferProofByInvolveeCount(address involvee)
      external view returns(uint256) {
    return LibFastHistory.data().transferProofInvolvements[involvee].length;
  }

  /**
   * @notice Returns pages of indices of past inbound and outbound transfer proofs by involvee.
   * @dev This function is reading from an indexing data structure. Each index points to a record
   * in the main transfer proof storage, and can then be found in `transferProofs` at returned indices.
   * @param involvee is the address for which to retrieve a page of data.
   * @param cursor is where to start.
   * @param perPage is how many records at most should be returned.
  */
  function paginateTransferProofIndicesByInvolvee(address involvee, uint256 cursor, uint256 perPage)
      external view returns(uint256[] memory, uint256) {
    return LibPaginate.uint256s(LibFastHistory.data().transferProofInvolvements[involvee], cursor, perPage);
  }

  /**
   * @notice Returns a page of inbound and outbound transfer proofs based on an involvee.#
   * @param involvee is the address for which to fetch the data.
   * @param cursor is where to start.
   * @param perPage is how many items at most to return.
   * @return A `(LibFastHistory.TransferProof[], uint256)` tuple containing the results and the cursor to the next page.
   */
  function paginateTransferProofsByInvolvee(address involvee, uint256 cursor, uint256 perPage)
      external view returns(LibFastHistory.TransferProof[] memory, uint256) {
    LibFastHistory.Data storage s = LibFastHistory.data();
    uint256[] storage collection  = s.transferProofInvolvements[involvee];
    uint256 length = (perPage > collection.length - cursor) ? collection.length - cursor : perPage;
    LibFastHistory.TransferProof[] memory values = new LibFastHistory.TransferProof[](length);
    for (uint256 i = 0; i < length; i++) {
      values[i] = s.transferProofs[collection[cursor + i]];
    }
    return (values, cursor + length);
  }
}
