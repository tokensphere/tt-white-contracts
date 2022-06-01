// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './lib/LibFastHistory.sol';
import '../lib/LibPaginate.sol';


contract FastHistoryFacet {
  /// Minting history-keeping methods.

  function minted(uint256 amount, string calldata ref)
      external diamondInternal() {
    // Keep track of the mint.
    LibFastHistory.data().supplyProofs.push(
      IFastHistory.SupplyProof({
        op: IFastHistory.SupplyOp.Mint,
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
      IFastHistory.SupplyProof({
        op: IFastHistory.SupplyOp.Burn,
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
      external view returns(IFastHistory.SupplyProof[] memory, uint256) {
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
      IFastHistory.TransferProof({
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
      external view returns(IFastHistory.TransferProof[] memory, uint256) {
    return LibPaginate.transferProofs(
      LibFastHistory.data().transferProofs,
      cursor,
      perPage
    );
  }

  function paginateTransferProofsByInvolvee(address involvee, uint256 cursor, uint256 perPage)
      external view returns(uint256[] memory, uint256) {
    return LibPaginate.uint256s(
      LibFastHistory.data().transferProofInvolvements[involvee],
      cursor,
      perPage
    );
  }

  /// Modifiers.

  modifier diamondInternal() {
    require(msg.sender == address(this), 'Cannot be called directly');
    _;
  }
}
