import { ethers } from "hardhat";
import { BigNumber, ContractFactory } from "ethers";
import { smock, MockContract } from "@defi-wonderland/smock";
import { FacetCutAction, FixtureFunc } from "hardhat-deploy/dist/types";
import { DEPLOYER_FACTORY_COMMON } from "../../src/utils";
import {
  Fast, FastTopFacet, FastAccessFacet, FastTokenFacet, FastHistoryFacet, FastFrontendFacet,
  FastTopFacet__factory, FastAccessFacet__factory, FastTokenFacet__factory,
  FastHistoryFacet__factory, FastFrontendFacet__factory
} from "../../typechain";
import { setupDiamondFacet } from "../utils";

interface FastFixtureOpts {
  readonly name: string;
  readonly deployer: string;
  readonly afterDeploy: (result: FastFixtureResult) => void
};

interface FastInitFacetArgs {
  readonly spc: string;
  readonly exchange: string;
  readonly governor: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: BigNumber;
  readonly hasFixedSupply: boolean;
  readonly isSemiPublic: boolean;
}

interface FastFixtureFuncArgs {
  readonly initWith: FastInitFacetArgs;
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
  async (hre, allOpts) => {
    if (!allOpts) throw 'You must provide FAST fixture options.';
    const { opts, initWith } = allOpts;
    // Deploy the diamond.
    const { address: fastAddr } = await hre.deployments.diamond.deploy(opts.name, {
      from: opts.deployer,
      owner: opts.deployer,
      facets: [],
      execute: { contract: 'FastInitFacet', methodName: 'initialize', args: [initWith] },
      deterministicSalt: DEPLOYER_FACTORY_COMMON.salt
    });
    const fast = await ethers.getContractAt<Fast>('Fast', fastAddr);

    // const facetMock = async function <T extends ContractFactory>(facet: string) {
    //   const mockFactory = await smock.mock<T>(facet);
    //   const mock = await mockFactory.deploy();
    //   await setupDiamondFacet(fast, mock, 'FastTopFacet', FacetCutAction.Add);
    //   return mock;
    // };

    // Set up a top facet fake and install it.
    const topFactory = await smock.mock<FastTopFacet__factory>('FastTopFacet');
    const topMock = await topFactory.deploy();
    await setupDiamondFacet(fast, topMock, 'FastTopFacet', FacetCutAction.Add);
    // Set up our access facet.
    const accessFactory = await smock.mock<FastAccessFacet__factory>('FastAccessFacet');
    const accessMock = await accessFactory.deploy();
    await setupDiamondFacet(fast, accessMock, 'FastAccessFacet', FacetCutAction.Add);
    // Set up our token facet.
    const tokenFactory = await smock.mock<FastTokenFacet__factory>('FastTokenFacet');
    const tokenMock = await tokenFactory.deploy();
    await setupDiamondFacet(fast, tokenMock, 'FastTokenFacet', FacetCutAction.Add);
    // Set up our history facet fake and install it.
    const historyFactory = await smock.mock<FastHistoryFacet__factory>('FastHistoryFacet');
    const historyMock = await historyFactory.deploy();
    await setupDiamondFacet(fast, historyMock, 'FastHistoryFacet', FacetCutAction.Add);
    // Set up our frontend facet fake and install it.
    const frontendFactory = await smock.mock<FastFrontendFacet__factory>('FastFrontendFacet');
    const frontendMock = await frontendFactory.deploy();
    await setupDiamondFacet(fast, frontendMock, 'FastFrontendFacet', FacetCutAction.Add);

    const result = { fast, topMock, accessMock, tokenMock, historyMock, frontendMock };
    await opts.afterDeploy.apply(this, [result]);
    return result;
  }