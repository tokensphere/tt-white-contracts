// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../fast/lib/LibFastHistory.sol";

library LibPaginate {
  function addresses(
    address[] storage collection,
    uint256 cursor,
    uint256 perPage
  ) internal view returns (address[] memory, uint256) {
    uint256 length = (perPage > collection.length - cursor) ? collection.length - cursor : perPage;
    address[] memory values = new address[](length);
    for (uint256 i = 0; i < length; ) {
      values[i] = collection[cursor + i];
      unchecked {
        ++i;
      }
    }
    return (values, cursor + length);
  }

  function uint256s(
    uint256[] storage collection,
    uint256 cursor,
    uint256 perPage
  ) internal view returns (uint256[] memory, uint256) {
    uint256 length = (perPage > collection.length - cursor) ? collection.length - cursor : perPage;
    uint256[] memory values = new uint256[](length);
    for (uint256 i = 0; i < length; ) {
      values[i] = collection[cursor + i];
      unchecked {
        ++i;
      }
    }
    return (values, cursor + length);
  }

  function supplyProofs(
    LibFastHistory.SupplyProof[] storage collection,
    uint256 cursor,
    uint256 perPage
  ) internal view returns (LibFastHistory.SupplyProof[] memory, uint256) {
    uint256 length = (perPage > collection.length - cursor) ? collection.length - cursor : perPage;
    LibFastHistory.SupplyProof[] memory values = new LibFastHistory.SupplyProof[](length);
    for (uint256 i = 0; i < length; ) {
      values[i] = collection[cursor + i];
      unchecked {
        ++i;
      }
    }
    return (values, cursor + length);
  }

  function transferProofs(
    LibFastHistory.TransferProof[] storage collection,
    uint256 cursor,
    uint256 perPage
  ) internal view returns (LibFastHistory.TransferProof[] memory, uint256) {
    uint256 length = (perPage > collection.length - cursor) ? collection.length - cursor : perPage;
    LibFastHistory.TransferProof[] memory values = new LibFastHistory.TransferProof[](length);
    for (uint256 i = 0; i < length; ) {
      values[i] = collection[cursor + i];
      unchecked {
        ++i;
      }
    }
    return (values, cursor + length);
  }
}
