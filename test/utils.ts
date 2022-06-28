import { ethers } from "hardhat";

export const one = ethers.utils.parseEther('1.0');
export const negOne = one.mul(-1);
export const two = ethers.utils.parseEther('2.0');
export const negTwo = two.mul(-1);
export const ten = ethers.utils.parseEther('10.0');
export const negTen = ten.mul(-1);
export const nine = ethers.utils.parseEther('9.0');
export const negNine = nine.mul(-1);
export const ninety = ethers.utils.parseEther('90.0');
export const negNinety = ninety.mul(-1);
export const oneHundred = ethers.utils.parseEther('100.0');
export const negOneHundred = oneHundred.mul(-1);
export const twoHundredForty = ethers.utils.parseEther('240.0');
export const negTwoHundredForty = twoHundredForty.mul(-1);
export const twoHundredFifty = ethers.utils.parseEther('250.0');
export const negTwoHundredFifty = twoHundredFifty.mul(-1);
export const tenThousand = ethers.utils.parseEther('10000.0');
export const oneMillion = ethers.utils.parseEther('1000000.0');

// Restriction codes.
export const INSUFFICIENT_TRANSFER_CREDITS_CODE = 1;
export const REQUIRES_FAST_MEMBERSHIP_CODE = 2;
export const REQUIRES_EXCHANGE_MEMBERSHIP_CODE = 3;
export const REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT_CODE = 4;

// Revert messages.
export const INTERNAL_METHOD = 'Internal method';
export const REQUIRES_DIAMOND_OWNERSHIP = 'Requires diamond ownership';

export const REQUIRES_SPC_MEMBERSHIP = 'Requires SPC membership';
export const REQUIRES_EXCHANGE_MEMBERSHIP = 'Requires Exchange membership';
export const REQUIRES_FAST_MEMBERSHIP = 'Requires FAST membership';
export const REQUIRES_FAST_GOVERNORSHIP = 'Requires FAST governorship';

export const DUPLICATE_ENTRY = 'Duplicate entry';
export const UNSUPPORTED_OPERATION = 'Unsupported operation';

export const MISSING_ATTACHED_ETH = 'Missing attached ETH';
export const REQUIRES_CONTINUOUS_SUPPLY = 'Requires continuous supply';
export const INSUFFICIENT_FUNDS = 'Insufficient token balance';
export const INSUFFICIENT_ALLOWANCE = 'Insufficient allowance';
export const INSUFFICIENT_TRANSFER_CREDITS = 'Insufficient transfer credits';
export const REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT = 'Requires different sender and recipient';
export const UNKNOWN_RESTRICTION_CODE = 'Unknown restriction code';
