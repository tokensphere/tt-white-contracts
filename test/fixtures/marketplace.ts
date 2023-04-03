import { ethers } from "hardhat";
import { MockContract } from "@defi-wonderland/smock";
import { FixtureFunc } from "hardhat-deploy/dist/types";
import { deploymentSalt, ZERO_ADDRESS } from "../../src/utils";
import { facetMock } from "../utils";
import {
  Marketplace,
  MarketplaceTopFacet,
  MarketplaceAccessFacet,
  MarketplaceInitFacet,
  MarketplaceTokenHoldersFacet,
  MarketplaceAutomatonsFacet,
  MarketplaceTopFacet__factory,
  MarketplaceAccessFacet__factory,
  MarketplaceTokenHoldersFacet__factory,
  MarketplaceAutomatonsFacet__factory,
} from "../../typechain";
import { MARKETPLACE_FACETS } from "../../tasks/marketplace";

export const MARKETPLACE_INIT_DEFAULTS: MarketplaceInitFacet.InitializerParamsStruct = {
  issuer: ZERO_ADDRESS,
};

interface MarketplaceFixtureResult {
  marketplace: Marketplace;
  topMock: MockContract<MarketplaceTopFacet>;
  accessMock: MockContract<MarketplaceAccessFacet>;
  tokenHoldersMock: MockContract<MarketplaceTokenHoldersFacet>;
  automatonsMock: MockContract<MarketplaceAutomatonsFacet>;
}
interface MarketplaceFixtureOpts {
  readonly name: string;
  readonly deployer: string;
  readonly afterDeploy: (result: MarketplaceFixtureResult) => void;
}
interface MarketplaceFixtureFuncArgs {
  readonly initWith: {};
  readonly opts: MarketplaceFixtureOpts;
}

export const marketplaceFixtureFunc: FixtureFunc<MarketplaceFixtureResult, MarketplaceFixtureFuncArgs> = async (
  hre,
  opts,
) => {
  // opts could be `undefined`.
  if (!opts) throw Error("You must provide Marketplace fixture options.");
  const {
    opts: { deployer, name, afterDeploy },
    initWith,
  } = opts;
  // Deploy diamond.
  const { address: marketplaceAddr } = await hre.deployments.diamond.deploy(name, {
    from: deployer,
    owner: deployer,
    facets: [...MARKETPLACE_FACETS, "MarketplaceInitFacet"],
    execute: {
      contract: "MarketplaceInitFacet",
      methodName: "initialize",
      args: [{ ...MARKETPLACE_INIT_DEFAULTS, ...initWith }],
    },
    deterministicSalt: deploymentSalt(hre),
  });

  // Get a Marketplace typed pointer.
  const marketplace = await ethers.getContractAt<Marketplace>("Marketplace", marketplaceAddr);
  // Build result.
  const result: MarketplaceFixtureResult = {
    marketplace,
    topMock: await facetMock<MarketplaceTopFacet__factory>(marketplace, "MarketplaceTopFacet"),
    accessMock: await facetMock<MarketplaceAccessFacet__factory>(marketplace, "MarketplaceAccessFacet"),
    tokenHoldersMock: await facetMock<MarketplaceTokenHoldersFacet__factory>(
      marketplace,
      "MarketplaceTokenHoldersFacet",
    ),
    automatonsMock: await facetMock<MarketplaceAutomatonsFacet__factory>(marketplace, "MarketplaceAutomatonsFacet"),
  };
  // Callback!
  await afterDeploy.apply(this, [result]);
  // Final return.
  return result;
};
