// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


library LibConstants {
  address internal constant ZERO_ADDRESS = address(0);
  address internal constant DEPLOYER_CONTRACT = 0x6DF2D25d8C6FD680730ee658b530A05a99BB769a;

  string internal constant ALREADY_INITIALIZED = 'Already initialized';
  string internal constant INTERNAL_METHOD = 'Internal method';
  string internal constant REQUIRES_DIAMOND_OWNERSHIP = 'Requires diamond ownership';
  string internal constant REQUIRES_FAST_CONTRACT_CALLER = 'Caller must be a FAST contract';

  string internal constant REQUIRES_SPC_MEMBERSHIP = 'Requires SPC membership';
  string internal constant REQUIRES_EXCHANGE_MEMBERSHIP = 'Requires Exchange membership';
  string internal constant REQUIRES_EXCHANGE_ACTIVE_MEMBER = 'Requires active Exchange member';
  string internal constant REQUIRES_EXCHANGE_DEACTIVATED_MEMBER = 'Requires a deactivated Exchange member';

  string internal constant REQUIRES_FAST_GOVERNORSHIP = 'Requires FAST governorship';
  string internal constant REQUIRES_FAST_MEMBERSHIP = 'Requires FAST membership';
  string internal constant REQUIRES_NO_FAST_MEMBERSHIPS = 'Member still part of at least one FAST';

  string internal constant DUPLICATE_ENTRY = 'Duplicate entry';
  string internal constant UNSUPPORTED_OPERATION = 'Unsupported operation';
  string internal constant REQUIRES_NON_ZERO_ADDRESS = 'Requires non-zero address';
  string internal constant REQUIRES_NON_CONTRACT_ADDR = 'Address cannot be a contract';

  string internal constant MISSING_ATTACHED_ETH = 'Missing attached ETH';

  string internal constant REQUIRES_CONTINUOUS_SUPPLY = 'Requires continuous supply';
  string internal constant INSUFFICIENT_FUNDS = 'Insufficient token balance';
  string internal constant INSUFFICIENT_ALLOWANCE = 'Insufficient allowance';
  string internal constant INSUFFICIENT_TRANSFER_CREDITS = 'Insufficient transfer credits';
  string internal constant REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT = 'Requires different sender and recipient';
  string internal constant UNKNOWN_RESTRICTION_CODE = 'Unknown restriction code';
}
