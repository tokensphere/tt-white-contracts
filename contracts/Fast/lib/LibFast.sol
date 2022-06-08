// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../../Spc.sol';
import '../../Exchange.sol';
import '../../lib/LibHelpers.sol';


library LibFast {

  string internal constant REQUIRES_DIAMOND_CALLER = 'E01';
  string internal constant REQUIRES_DIAMOND_OWNERSHIP = 'E02';

  string internal constant REQUIRES_SPC_MEMBERSHIP = 'E03';
  string internal constant REQUIRES_EXCHANGE_MEMBERSHIP = 'E04';
  string internal constant REQUIRES_FAST_GOVERNORSHIP = 'E05';
  string internal constant REQUIRES_FAST_MEMBERSHIP = 'E06';

  string internal constant DUPLICATE_ENTRY = 'E10';
  string internal constant UNSUPPORTED_OPERATION = 'E11';

  string internal constant MISSING_ATTACHED_ETH = 'E20';
  string internal constant REQUIRES_CONTINUOUS_SUPPLY = 'E21';
  string internal constant INSUFICIENT_FUNDS = 'E22';
  string internal constant INSUFICIENT_ALLOWANCE = 'E23';
  string internal constant INSUFICIENT_TRANSFER_CREDITS = 'E24';
  string internal constant REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT = 'E25';
  string internal constant UNKNOWN_RESTRICTION_CODE = 'E26';

  struct Data {
    Spc spc;
    Exchange exchange;
  }

  function data()
      internal pure returns(Data storage s) {
    bytes32 pos = keccak256('Fast.storage.Fast');
    assembly {s.slot := pos}
  }

  /**
  * @dev This function allows contracts of the FAST network to request ETH
  * provisioning to arbitrary addresses.
  */
  function payUpTo(address payable recipient, uint256 amount)
      internal {
    amount = LibHelpers.upTo(recipient, amount);
    // Transfer some eth!
    recipient.transfer(amount);
  }
}
