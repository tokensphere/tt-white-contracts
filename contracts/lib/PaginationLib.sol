// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../interfaces/IFastHistory.sol';

library PaginationLib {
  function addresses(address[] memory collection, uint256 cursor, uint256 perPage)
    public pure returns(address[] memory, uint256) {
      uint256 count = collection.length;
      uint256 length = (perPage > count - cursor) ? count - cursor : perPage;
      address[] memory values = new address[](length);
      for (uint256 i = 0; i < length; i++) {
          values[i] = collection[cursor + i];
      }
      return (values, cursor + length);
  }

  function uint256s(uint256[] memory collection, uint256 cursor, uint256 perPage)
    public pure returns(uint256[] memory, uint256) {
      uint256 count = collection.length;
      uint256 length = (perPage > count - cursor) ? count - cursor : perPage;
      uint256[] memory values = new uint256[](length);
      for (uint256 i = 0; i < length; i++) {
          values[i] = collection[cursor + i];
      }
      return (values, cursor + length);
  }

  function mintingProofs(IFastHistory.MintingProof[] memory collection, uint256 cursor, uint256 perPage)
    public pure returns(IFastHistory.MintingProof[] memory, uint256) {
      uint256 count = collection.length;
      uint256 length = (perPage > count - cursor) ? count - cursor : perPage;
      IFastHistory.MintingProof[] memory values = new IFastHistory.MintingProof[](length);
      for (uint256 i = 0; i < length; i++) {
          values[i] = collection[cursor + i];
      }
      return (values, cursor + length);
  }

  function transferProofs(IFastHistory.TransferProof[] memory collection, uint256 cursor, uint256 perPage)
    public pure returns(IFastHistory.TransferProof[] memory, uint256) {
      uint256 count = collection.length;
      uint256 length = (perPage > count - cursor) ? count - cursor : perPage;
      IFastHistory.TransferProof[] memory values = new IFastHistory.TransferProof[](length);
      for (uint256 i = 0; i < length; i++) {
          values[i] = collection[cursor + i];
      }
      return (values, cursor + length);
  }
}