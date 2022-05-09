// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import './lib/PaginationLib.sol';
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
  // All transfers IDs involving a given address are kept here.
  mapping(address => uint256[]) public transferProofInvolvements;

  function initialize(FastRegistry _reg)
      external initializer {
    reg = _reg;
  }

  /// Minting history-keeping methods.

  function addMintingProof(uint256 amount, string memory ref)
      tokenContract(msg.sender)
      external override {
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

  function paginateMintingProofs(uint256 cursor, uint256 perPage)
      public view returns(IFastHistory.MintingProof[] memory, uint256) {
    return PaginationLib.mintingProofs(mintingProofs, cursor, perPage);
  }

  /// Transfer history-keeping methods.

  function addTransferProof(address spender, address from, address to, uint256 amount, string memory ref)
      tokenContract(msg.sender)
      external override {
    // Keep track of the transfer proof ID for the sender.
    transferProofInvolvements[from].push(transferProofs.length);
    // Keep track of the transfer proof ID for the recipient.
    transferProofInvolvements[to].push(transferProofs.length);
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
