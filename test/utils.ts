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
export const twoHundredFourty = ethers.utils.parseEther('240.0');
export const negTwoHundredFourty = twoHundredFourty.mul(-1);
export const twoHundredFifty = ethers.utils.parseEther('250.0');
export const negTwoHundredFifty = twoHundredFifty.mul(-1);
export const oneMilion = ethers.utils.parseEther('1000000.0');

// Restriction codes.
export const INSUFICIENT_TRANSFER_CREDITS_CODE = 1;
export const REQUIRES_FAST_MEMBERSHIP_CODE = 2;
export const REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT_CODE = 4;

// Revert messages.
export const REQUIRES_DIAMOND_CALLER = 'E01';
export const REQUIRES_DIAMOND_OWNERSHIP = 'E02';
export const REQUIRES_SPC_MEMBERSHIP = 'E03';
export const REQUIRES_EXCHANGE_MEMBERSHIP = 'E04';
export const REQUIRES_FAST_GOVERNORSHIP = 'E05';
export const REQUIRES_FAST_MEMBERSHIP = 'E06';
export const DUPLICATE_ENTRY = 'E10';
export const UNSUPPORTED_OPERATION = 'E11';
export const MISSING_ATTACHED_ETH = 'E20';
export const REQUIRES_CONTINUOUS_SUPPLY = 'E21';
export const INSUFICIENT_FUNDS = 'E22';
export const INSUFICIENT_ALLOWANCE = 'E23';
export const INSUFICIENT_TRANSFER_CREDITS = 'E24';
export const REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT = 'E25';
export const UNKNOWN_RESTRICTION_CODE = 'E26';
