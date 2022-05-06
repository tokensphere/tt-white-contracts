// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import './interfaces/IFastHistory.sol';
import './FastRegistry.sol';


/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract FastHistory is Initializable, IFastHistory {

  /// Members.
  
  // Contract registry.
  FastRegistry public reg;

  // All minting proofs are kept here.
  IFastHistory.MintingProof[] private mintingProofs;

  // All transfer proofs are kept here.
  IFastHistory.TransferProof[] private transferProofs;
  // All transfers IDs for a given sender are kept here.
  mapping(address => uint256[]) public senderTransferProofs;
  // All transfers IDs for a given recipient are kept here.
  mapping(address => uint256[]) public recipientTransferProofs;

  function initialize(FastRegistry _reg)
      external initializer {
    reg = _reg;
  }

  /// Minting history-keeping methods.

  function addMintingProof(uint256 amount, string memory ref)
      public override {
    // Keep track of the mint.
    mintingProofs.push(
      IFastHistory.MintingProof({
        amount: amount,
        blockNumber: block.number,
        ref: ref
      })
    );
  }

  function mintingProofCount()
      external view returns(uint256) {
    return mintingProofs.length;
  }

  function mintingProofAt(uint256 index)
      external view returns(IFastHistory.MintingProof memory) {
    return mintingProofs[index];
  }

  function mintingProofsAt(uint256 cursor, uint256 perPage)
    public view returns(IFastHistory.MintingProof[] memory, uint256) {
      uint256 count = mintingProofs.length;
      uint256 length = perPage;
      if (length > count - cursor) {
          length = count - cursor;
      }
      IFastHistory.MintingProof[] memory values = new IFastHistory.MintingProof[](length);
      for (uint256 i = 0; i < length; i++) {
          values[i] = mintingProofs[cursor + i];
      }
      return (values, cursor + length);
  }

  /// Transfer history-keeping methods.

  function addTransferProof(address spender, address from, address to, uint256 amount, string memory ref)
      public override {
    // Keep track of the transfer proof ID for the sender.
    senderTransferProofs[from].push(transferProofs.length);
    // Keep track of the transfer proof ID for the recipient.
    recipientTransferProofs[to].push(transferProofs.length);
    // Keep track of the transfer proof globally.
    transferProofs.push(
      IFastHistory.TransferProof({
        from: from,
        spender: spender,
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

  function transferProofAt(uint256 index)
      external view returns(IFastHistory.TransferProof memory) {
    return transferProofs[index];
  }

  function transferProofsAt(uint256 cursor, uint256 perPage)
    public view returns(IFastHistory.TransferProof[] memory, uint256) {
      uint256 count = transferProofs.length;
      uint256 length = perPage;
      if (length > count - cursor) {
          length = count - cursor;
      }
      IFastHistory.TransferProof[] memory values = new IFastHistory.TransferProof[](length);
      for (uint256 i = 0; i < length; i++) {
          values[i] = transferProofs[cursor + i];
      }
      return (values, cursor + length);
  }
}
