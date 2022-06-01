// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../interfaces/IFastHistory.sol';
import '../interfaces/IFastRegistry.sol';

library LibPaginate {
  function addresses(address[] storage collection, uint256 cursor, uint256 perPage)
    internal view returns(address[] memory, uint256) {
      uint256 count = collection.length;
      uint256 length = (perPage > count - cursor) ? count - cursor : perPage;
      address[] memory values = new address[](length);
      for (uint256 i = 0; i < length; i++) {
          values[i] = collection[cursor + i];
      }
      return (values, cursor + length);
  }

  function fastRegistries(IFastRegistry[] storage collection, uint256 cursor, uint256 perPage)
    internal view returns(IFastRegistry[] memory, uint256) {
      uint256 count = collection.length;
      uint256 length = (perPage > count - cursor) ? count - cursor : perPage;
      IFastRegistry[] memory values = new IFastRegistry[](length);
      for (uint256 i = 0; i < length; i++) {
          values[i] = collection[cursor + i];
      }
      return (values, cursor + length);
  }

  function uint256s(uint256[] storage collection, uint256 cursor, uint256 perPage)
    internal view returns(uint256[] memory, uint256) {
      uint256 count = collection.length;
      uint256 length = (perPage > count - cursor) ? count - cursor : perPage;
      uint256[] memory values = new uint256[](length);
      for (uint256 i = 0; i < length; i++) {
          values[i] = collection[cursor + i];
      }
      return (values, cursor + length);
  }

  function supplyProofs(IFastHistory.SupplyProof[] storage collection, uint256 cursor, uint256 perPage)
    internal view returns(IFastHistory.SupplyProof[] memory, uint256) {
      uint256 count = collection.length;
      uint256 length = (perPage > count - cursor) ? count - cursor : perPage;
      IFastHistory.SupplyProof[] memory values = new IFastHistory.SupplyProof[](length);
      for (uint256 i = 0; i < length; i++) {
          values[i] = collection[cursor + i];
      }
      return (values, cursor + length);
  }

  function transferProofs(IFastHistory.TransferProof[] storage collection, uint256 cursor, uint256 perPage)
    internal view returns(IFastHistory.TransferProof[] memory, uint256) {
      uint256 count = collection.length;
      uint256 length = (perPage > count - cursor) ? count - cursor : perPage;
      IFastHistory.TransferProof[] memory values = new IFastHistory.TransferProof[](length);
      for (uint256 i = 0; i < length; i++) {
          values[i] = collection[cursor + i];
      }
      return (values, cursor + length);
  }
}