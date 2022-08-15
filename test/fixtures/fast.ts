import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { MockContract } from "@defi-wonderland/smock";
import { FixtureFunc } from "hardhat-deploy/dist/types";
import { deploymentSalt, ZERO_ADDRESS } from "../../src/utils";
import { facetMock } from "../utils";
import {
  Fast, FastTopFacet, FastAccessFacet, FastTokenFacet, FastHistoryFacet, FastFrontendFacet,
  FastTopFacet__factory, FastAccessFacet__factory, FastTokenFacet__factory,
  FastHistoryFacet__factory, FastFrontendFacet__factory, FastInitFacet
} from "../../typechain";
import { FAST_FACETS } from "../../tasks/fast";


export const FAST_INIT_DEFAULTS: FastInitFacet.InitializerParamsStruct = {
  marketplace: ZERO_ADDRESS,
  issuer: ZERO_ADDRESS,
  governor: ZERO_ADDRESS,
  name: 'Random FAST Token',
  symbol: 'RFT',
  decimals: 18,
  hasFixedSupply: true,
  isSemiPublic: false
};

interface FastFixtureOpts {
  readonly name: string;
  readonly deployer: string;
  readonly afterDeploy: (result: FastFixtureResult) => void
};
interface FastFixtureFuncArgs {
  readonly initWith: {};
  readonly opts: FastFixtureOpts;
};
interface FastFixtureResult {
  fast: Fast;
  topMock: MockContract<FastTopFacet>;
  accessMock: MockContract<FastAccessFacet>;
  tokenMock: MockContract<FastTokenFacet>;
  historyMock: MockContract<FastHistoryFacet>;
  frontendMock: MockContract<FastFrontendFacet>;
}

export const fastFixtureFunc: FixtureFunc<FastFixtureResult, FastFixtureFuncArgs> =
  async (hre, opts) => {
    // opts could be `undefined`.
    if (!opts) throw 'You must provide FAST fixture options.';
    const { opts: { deployer, name, afterDeploy }, initWith } = opts;
    // Deploy diamond.
    const { address: fastAddr } = await hre.deployments.diamond.deploy(name, {
      from: deployer,
      owner: deployer,
      facets: FAST_FACETS,
      execute: {
        contract: 'FastInitFacet',
        methodName: 'initialize',
        args: [{ ...FAST_INIT_DEFAULTS, ...initWith }]
      },
      deterministicSalt: deploymentSalt(hre)
    });

    // Get a FAST typed pointer.
    const fast = await ethers.getContractAt<Fast>('Fast', fastAddr);
    // Build result.
    const result: FastFixtureResult = {
      fast,
      topMock: await facetMock<FastTopFacet__factory>(fast, 'FastTopFacet'),
      accessMock: await facetMock<FastAccessFacet__factory>(fast, 'FastAccessFacet'),
      tokenMock: await facetMock<FastTokenFacet__factory>(fast, 'FastTokenFacet'),
      historyMock: await facetMock<FastHistoryFacet__factory>(fast, 'FastHistoryFacet'),
      frontendMock: await facetMock<FastFrontendFacet__factory>(fast, 'FastFrontendFacet')
    };
    // Callback!
    await afterDeploy.apply(this, [result]);
    // Final return.
    return result;
  }
