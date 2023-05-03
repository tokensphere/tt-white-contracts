import {
  smock,
  FakeContract,
  MockContract,
  MockContractFactory,
} from "@defi-wonderland/smock";
import { BaseContract, ContractFactory } from "ethers";
import { FunctionFragment, Interface } from "ethers/lib/utils";
import { artifacts, ethers } from "hardhat";
import { FacetCutAction } from "hardhat-deploy/dist/types";
import { toUnpaddedHexString } from "../src/utils";
import { IDiamondCut } from "../typechain";

export const zero = ethers.utils.parseEther("0.0");
export const one = ethers.utils.parseEther("1.0");
export const two = ethers.utils.parseEther("2.0");
export const ten = ethers.utils.parseEther("10.0");
export const nine = ethers.utils.parseEther("9.0");
export const ninety = ethers.utils.parseEther("90.0");
export const oneHundred = ethers.utils.parseEther("100.0");
export const oneMillion = ethers.utils.parseEther("1000000.0");

export const DEFAULT_TRANSFER_REFERENCE = "Unspecified - via ERC20";
export const UNDERFLOWED_OR_OVERFLOWED = "panic code 0x11";

// Distribution phases.
export enum DistributionPhase {
  Funding = 0,
  FeeSetup = 1,
  BeneficiariesSetup = 2,
  Withdrawal = 3,
  Terminated = 4,
}

// Crowdfund phases.
export enum CrowdFundPhase {
  Setup = 0,
  Funding = 1,
  Success = 2,
  Failure = 3,
}

// Get a POJO from a struct.
export const abiStructToObj = ({ ...struct }) => {
  const entries = Object.entries(struct);
  return Object.fromEntries(entries.slice(entries.length / 2));
};

export const impersonateContract = async <T extends BaseContract>(
  contract: T,
  calledBy?: string
): Promise<T> => {
  // Are we switching _who_ is calling this contract?
  const callerAddress = calledBy || contract.address;
  // Provision the fast with some ETH.
  await ethers.provider.send("hardhat_setBalance", [
    callerAddress,
    toUnpaddedHexString(one),
  ]);
  // Allow to impersonate the FAST.
  await ethers.provider.send("hardhat_impersonateAccount", [callerAddress]);
  return contract.connect(await ethers.getSigner(callerAddress)) as T;
};

const setupDiamondFacet = async <T extends BaseContract>(
  diamond: IDiamondCut,
  fake: FakeContract<T> | MockContract<T>,
  facet: string,
  action: FacetCutAction
) => {
  // We want to cut in our swapped out FastTokenFacet mock.
  await diamond.diamondCut(
    [
      {
        facetAddress: fake.address,
        action,
        functionSelectors: sigsFromABI(
          (
            await artifacts.readArtifact(facet)
          ).abi
        ),
      },
    ],
    ethers.constants.AddressZero,
    "0x"
  );
};

// Used when setting up a diamond facet.
export const sigsFromABI = (abi: any[]): string[] =>
  abi
    .filter((frag) => frag.type === "function")
    .map((frag) => Interface.getSighash(FunctionFragment.from(frag)));

declare type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

export const facetMock = async <F extends ContractFactory>(
  diamond: IDiamondCut,
  facet: string
) => {
  const mockFactory = await smock.mock<F>(facet);
  // Yikes. We would need to be able to infer that `mockFactory` has a `deploy` function
  // that returns the same type than the successful promise type of the `deploy` on type `F`...
  const mock = await (mockFactory as MockContractFactory<any>).deploy();
  await setupDiamondFacet(diamond, mock, facet, FacetCutAction.Replace);
  // More or less solved here... But needing `any` two lines ago isn't great.
  return mock as MockContract<ThenArg<ReturnType<F["deploy"]>>>;
};
