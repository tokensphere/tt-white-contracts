// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../lib/LibPaginate.sol';
import './lib/AFastFacet.sol';
import './lib/LibFastHistory.sol';


contract FastHistoryFacet is AFastFacet {
  /// Minting history-keeping methods.

  function minted(uint256 amount, string calldata ref)
      external diamondInternal() {
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

  function burnt(uint256 amount, string calldata ref)
      external diamondInternal() {
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

  function supplyProofCount()
      external view returns(uint256) {
    return LibFastHistory.data().supplyProofs.length;
  }

  function paginateSupplyProofs(uint256 cursor, uint256 perPage)
      external view returns(LibFastHistory.SupplyProof[] memory, uint256) {
    return LibPaginate.supplyProofs(LibFastHistory.data().supplyProofs, cursor, perPage);
  }

  /// Transfer history-keeping methods.

  function transfered(address spender, address from, address to, uint256 amount, string calldata ref)
      external diamondInternal() {
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

  function transferProofCount()
      external view returns(uint256) {
    return LibFastHistory.data().transferProofs.length;
  }

  function paginateTransferProofs(uint256 cursor, uint256 perPage)
      external view returns(LibFastHistory.TransferProof[] memory, uint256) {
    return LibPaginate.transferProofs(LibFastHistory.data().transferProofs, cursor, perPage);
  }

  function transferProofByInvolveeCount(address involvee)
      external view returns(uint256) {
    return LibFastHistory.data().transferProofInvolvements[involvee].length;
  }

  function paginateTransferProofIndicesByInvolvee(address involvee, uint256 cursor, uint256 perPage)
      external view returns(uint256[] memory, uint256) {
    return LibPaginate.uint256s(LibFastHistory.data().transferProofInvolvements[involvee], cursor, perPage);
  }

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
