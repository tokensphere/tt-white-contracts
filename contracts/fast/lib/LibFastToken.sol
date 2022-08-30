// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../lib/LibAddressSet.sol';


library LibFastToken {
  // The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  // This is keccak256('Fast.storage.Token'):
  bytes32 internal constant STORAGE_SLOT = 0xb098747b87c5c0e2a32eb9b06725e9bad4263809bcda628ceadc1a686bcb8261;

  // Constants.

  string internal constant DEFAULT_TRANSFER_REFERENCE = 'Unspecified - via ERC20';

  // Data structures.

  struct Data {
    /// @dev The latest intializer version that was called.
    uint16 version;
    // ERC20 related properties for this FAST Token.
    string name;
    string symbol;
    uint8 decimals;
    uint256 totalSupply;
    // Every time a transfer is executed, the credit decreases by the amount
    // of said transfer.
    // It becomes impossible to transact once it reaches zero, and must
    // be provisioned by an Issuer member.
    uint256 transferCredits;
    // Our members balances are held here.
    mapping(address => uint256) balances;
    // Allowances are stored here.
    mapping(address => mapping(address => uint256)) allowances;
    mapping(address => LibAddressSet.Data) allowancesByOwner;
    mapping(address => LibAddressSet.Data) allowancesBySpender;
    // Token holders
    LibAddressSet.Data tokenHolders;
  }

  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
