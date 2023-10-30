import { ethers } from "hardhat";
import { MockContract } from "@defi-wonderland/smock";
import { FixtureFunc } from "hardhat-deploy/dist/types";
import { deploymentSalt, ZERO_ADDRESS } from "../../src/utils";
import { facetMock } from "../utils";
import {
  PaymasterTopFacet,
  PaymasterInitFacet,
  PaymasterTopFacet__factory,
} from "../../typechain";
import { PAYMASTER_FACETS } from "../../tasks/paymaster";
import { Paymaster } from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";

export const PAYMASTER_INIT_DEFAULTS: PaymasterInitFacet.InitializerParamsStruct =
{
  marketplace: ZERO_ADDRESS,
};

interface PaymasterFixtureResult {
  paymaster: Paymaster;
  topMock: MockContract<PaymasterTopFacet>;
}
interface PaymasterFixtureOpts {
  readonly name: string;
  readonly deployer: string;
  readonly afterDeploy: (result: PaymasterFixtureResult) => void;
}
interface PaymasterFixtureFuncArgs {
  readonly initWith: {};
  readonly opts: PaymasterFixtureOpts;
}

export const paymasterFixtureFunc: FixtureFunc<
  PaymasterFixtureResult,
  PaymasterFixtureFuncArgs
> = async (hre, opts) => {
  // opts could be `undefined`.
  if (!opts) throw Error("You must provide Paymaster fixture options.");
  const {
    opts: { deployer, name, afterDeploy },
    initWith,
  } = opts;
  // Deploy diamond.
  const { address: paymasterAddr } = await hre.deployments.diamond.deploy(
    name,
    {
      from: deployer,
      owner: deployer,
      facets: [...PAYMASTER_FACETS, "PaymasterInitFacet"],
      execute: {
        contract: "PaymasterInitFacet",
        methodName: "initialize",
        args: [{ ...PAYMASTER_INIT_DEFAULTS, ...initWith }],
      },
      deterministicSalt: deploymentSalt(hre),
      excludeSelectors: {
        "PaymasterTopFacet": ["supportsInterface"]
      }
    }
  );

  // Get a Paymaster typed pointer.
  const paymaster = await ethers.getContractAt<Paymaster>(
    "Paymaster",
    paymasterAddr
  );
  // Build result.
  const result: PaymasterFixtureResult = {
    paymaster,
    topMock: await facetMock<PaymasterTopFacet__factory>(
      paymaster,
      "PaymasterTopFacet"
    ),
  };
  // Callback!
  await afterDeploy.apply(this, [result]);
  // Final return.
  return result;
};
