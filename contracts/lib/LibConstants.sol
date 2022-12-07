// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


library LibConstants {
  address internal constant ZERO_ADDRESS = address(0);
  address internal constant DEPLOYER_CONTRACT = 0x6DF2D25d8C6FD680730ee658b530A05a99BB769a;

  string internal constant INSUFFICIENT_TRANSFER_CREDITS = 'Insufficient transfer credits';
  string internal constant REQUIRES_MARKETPLACE_MEMBERSHIP = 'Requires Marketplace membership';
  string internal constant REQUIRES_FAST_MEMBERSHIP = 'Requires FAST membership';
  string internal constant REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT = 'Requires different sender and recipient';

  string internal constant DEAD_TOKENS_RETRIEVAL = 'Dead tokens retrieval';
}