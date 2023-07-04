// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

contract SimpleProxy {
  address public owner;
  address public impl;

  constructor(address _impl) {
    owner = msg.sender;
    impl = _impl;
  }

  function _fallback() internal virtual {
    assembly {
      // Copy msg.data. We take full control of memory in this inline assembly
      // block because it will not return to Solidity code. We overwrite the
      // Solidity scratch pad at memory position 0.
      calldatacopy(0, 0, calldatasize())
      // Call the implementation.
      // out and outsize are 0 because we don't know the size yet.
      let result := delegatecall(gas(), sload(impl.slot), 0, calldatasize(), 0, 0)
      // Copy the returned data.
      returndatacopy(0, 0, returndatasize())
      // Check for errors.
      switch result
      // Error case...
      case 0 {
        revert(0, returndatasize())
      }
      // Success case...
      default {
        return(0, returndatasize())
      }
    }
  }

  fallback() external payable virtual {
    _fallback();
  }

  receive() external payable virtual {
    _fallback();
  }
}
