import { smock, FakeContract, MockContract, MockContractFactory } from "@defi-wonderland/smock";
import { BaseContract, ContractFactory } from "ethers";
import { FunctionFragment, Interface } from "ethers/lib/utils";
import { artifacts, ethers } from "hardhat";
import { FacetCutAction } from "hardhat-deploy/dist/types";
import { toUnpaddedHexString } from "../src/utils";
import { IDiamondCut } from "../typechain";

export const zero = ethers.utils.parseEther('0.0');
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
export const DEFAULT_TRANSFER_REFERENCE = 'Unspecified - via ERC20';
export const REQUIRES_NO_FAST_MEMBERSHIPS = 'Member still part of at least one FAST';
export const REQUIRES_FAST_CONTRACT_CALLER = 'Caller must be a FAST contract';
export const REQUIRES_NON_ZERO_ADDRESS = 'Requires non-zero address';

export const DUPLICATE_ENTRY = 'Duplicate entry';
export const UNSUPPORTED_OPERATION = 'Unsupported operation';

export const MISSING_ATTACHED_ETH = 'Missing attached ETH';
export const REQUIRES_CONTINUOUS_SUPPLY = 'Requires continuous supply';
export const INSUFFICIENT_FUNDS = 'Insufficient token balance';
export const INSUFFICIENT_ALLOWANCE = 'Insufficient allowance';
export const INSUFFICIENT_TRANSFER_CREDITS = 'Insufficient transfer credits';
export const REQUIRES_DIFFERENT_SENDER_AND_RECIPIENT = 'Requires different sender and recipient';
export const UNKNOWN_RESTRICTION_CODE = 'Unknown restriction code';
export const BALANCE_IS_POSITIVE = 'Balance is positive';

// Get a POJO from a struct.
export const structToObj = (struct: {}) => {
  let
    entries = Object.entries(struct),
    start = entries.length / 2;
  return Object.fromEntries(entries.slice(start));
};

export const impersonateContract =
  async <T extends BaseContract>(contract: T): Promise<T> => {
    // Provision the fast with some ETH.
    await ethers.provider.send('hardhat_setBalance', [contract.address, toUnpaddedHexString(one)]);
    // Allow to impersonate the FAST.
    await ethers.provider.send("hardhat_impersonateAccount", [contract.address]);
    return contract.connect(await ethers.getSigner(contract.address)) as T;
  };

const setupDiamondFacet =
  async <T extends BaseContract>(
    diamond: IDiamondCut,
    fake: FakeContract<T> | MockContract<T>,
    facet: string,
    action: FacetCutAction
  ) => {
    // We want to cut in our swapped out FastTokenFacet mock.
    await diamond.diamondCut([{
      facetAddress: fake.address,
      action,
      functionSelectors: sigsFromABI((await artifacts.readArtifact(facet)).abi)
    }], ethers.constants.AddressZero, '0x');
  };

// Used when setting up a diamond facet.
export const sigsFromABI = (abi: any[]): string[] =>
  abi
    .filter(frag => frag.type === 'function')
    .map(frag => Interface.getSighash(FunctionFragment.from(frag)));

declare type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

export const facetMock = async <F extends ContractFactory>(diamond: IDiamondCut, facet: string) => {
  const mockFactory = await smock.mock<F>(facet);
  // Yikes. We would need to be able to infer that `mockFactory` has a `deploy` function
  // that returns the same type than the successful promise type of the `deploy` on type `F`...
  const mock = await (mockFactory as MockContractFactory<any>).deploy();
  await setupDiamondFacet(diamond, mock, facet, FacetCutAction.Replace);
  // More or less solved here... But needing `any` two lines ago isn't great.
  return mock as MockContract<ThenArg<ReturnType<F['deploy']>>>;
};
