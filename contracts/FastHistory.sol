// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import './lib/PaginationLib.sol';
import './interfaces/IFastHistory.sol';
import './FastRegistry.sol';


/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract FastHistory is Initializable, IFastHistory {
  /// Members.
  
  // Contract registry.
  FastRegistry public reg;

  // All minting proofs are kept here.
  IFastHistory.SupplyProof[] private supplyProofs;

  // All transfer proofs are kept here.
  IFastHistory.TransferProof[] private transferProofs;
  // All transfers IDs involving a given address are kept here.
  mapping(address => uint256[]) private transferProofInvolvements;

  function initialize(FastRegistry _reg)
      external initializer {
    reg = _reg;
  }

  /// Minting history-keeping methods.

  function minted(uint256 amount, string calldata ref)
      tokenContract(msg.sender)
      external override {
    // Keep track of the mint.
    supplyProofs.push(
      IFastHistory.SupplyProof({
        op: IFastHistory.SupplyOp.Mint,
        amount: amount,
        blockNumber: block.number,
        ref: ref
      })
    );
  }

  function burnt(uint256 amount, string calldata ref)
      tokenContract(msg.sender)
      external override {
    // Keep track of the unmint.
    supplyProofs.push(
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
    return supplyProofs.length;
  }

  function paginateSupplyProofs(uint256 cursor, uint256 perPage)
      public view returns(IFastHistory.SupplyProof[] memory, uint256) {
    return PaginationLib.supplyProofs(supplyProofs, cursor, perPage);
  }

  /// Transfer history-keeping methods.

  function transfered(address spender, address from, address to, uint256 amount, string calldata ref)
      tokenContract(msg.sender)
      external override {
    // Keep track of the transfer proof ID for the sender and for the recipient.
    transferProofInvolvements[from].push(transferProofs.length);
    transferProofInvolvements[to].push(transferProofs.length);
    // Keep track of the transfer proof globally.
    transferProofs.push(
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
    return transferProofs.length;
  }

  function paginateTransferProofs(uint256 cursor, uint256 perPage)
      public view returns(IFastHistory.TransferProof[] memory, uint256) {
    return PaginationLib.transferProofs(transferProofs, cursor, perPage);
  }

  function paginateTransferProofsByInvolvee(address involvee, uint256 cursor, uint256 perPage)
      public view returns(uint256[] memory, uint256) {
    return PaginationLib.uint256s(transferProofInvolvements[involvee], cursor, perPage);
  }

  /// Modifiers.

  modifier tokenContract(address a) {
    require(a == address(reg.token()), 'Cannot be called directly');
    _;
  }
}
