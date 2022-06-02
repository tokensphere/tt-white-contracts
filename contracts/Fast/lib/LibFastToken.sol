// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../lib/LibAddressSet.sol';


library LibFastToken {
  struct Data {
    // ERC20 related properties for this FAST Token.
    string name;
    string symbol;
    uint256 decimals;
    uint256 totalSupply;
    // Every time a transfer is executed, the credit decreases by the amount
    // of said transfer.
    // It becomes impossible to transact once it reaches zero, and must
    // be provisioned by an SPC governor.
    uint256 transferCredits;
    // Whether or not external people can hold and transfer tokens on this FAST.
    bool isSemiPublic;
    // We have to track whether this token has continuous minting or fixed supply.
    bool hasFixedSupply;
    // Our members balances are held here.
    mapping(address => uint256) balances;
    // Allowances are stored here.
    mapping(address => mapping(address => uint256)) allowances;
    mapping(address => LibAddressSet.Data) allowancesByOwner;
    mapping(address => LibAddressSet.Data) allowancesBySpender;
  }

  function data()
      internal pure returns(Data storage s) {
    bytes32 pos = keccak256('Fast.storage.FastToken');
    assembly {s.slot := pos}
  }
}
