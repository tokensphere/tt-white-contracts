import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { MockContract } from "@defi-wonderland/smock";
import { FixtureFunc } from "hardhat-deploy/dist/types";
import { deploymentSalt, ZERO_ADDRESS } from "../../src/utils";
import { facetMock } from "../utils";
import {
  Exchange, ExchangeTopFacet, ExchangeAccessFacet, ExchangeInitFacet,
  ExchangeTopFacet__factory, ExchangeAccessFacet__factory,
} from "../../typechain";
import { EXCHANGE_FACETS } from "../../tasks/exchange";


export const EXCHANGE_INIT_DEFAULTS: ExchangeInitFacet.InitializerParamsStruct = {
  spc: ZERO_ADDRESS
};

interface ExchangeFixtureOpts {
  readonly name: string;
  readonly deployer: string;
  readonly afterDeploy: (result: ExchangeFixtureResult) => void
};
interface ExchangeFixtureFuncArgs {
  readonly initWith: {};
  readonly opts: ExchangeFixtureOpts;
};
interface ExchangeFixtureResult {
  exchange: Exchange;
  topMock: MockContract<ExchangeTopFacet>;
  accessMock: MockContract<ExchangeAccessFacet>;
}

export const exchangeFixtureFunc: FixtureFunc<ExchangeFixtureResult, ExchangeFixtureFuncArgs> =
  async (hre, opts) => {
    // opts could be `undefined`.
    if (!opts) throw 'You must provide Exchange fixture options.';
    const { opts: { deployer, name, afterDeploy }, initWith } = opts;
    // Deploy diamond.
    const { address: exchangeAddr } = await hre.deployments.diamond.deploy(name, {
      from: deployer,
      owner: deployer,
      facets: EXCHANGE_FACETS,
      execute: {
        contract: 'ExchangeInitFacet',
        methodName: 'initialize',
        args: [{ ...EXCHANGE_INIT_DEFAULTS, ...initWith }]
      },
      deterministicSalt: deploymentSalt(hre)
    });

    // Get a EXCHANGE typed pointer.
    const exchange = await ethers.getContractAt<Exchange>('Exchange', exchangeAddr);
    // Build result.
    const result: ExchangeFixtureResult = {
      exchange,
      topMock: await facetMock<ExchangeTopFacet__factory>(exchange, 'ExchangeTopFacet'),
      accessMock: await facetMock<ExchangeAccessFacet__factory>(exchange, 'ExchangeAccessFacet'),
    };
    // Callback!
    await afterDeploy.apply(this, [result]);
    // Final return.
    return result;
  }
