import { ethers } from "hardhat";
import { ContractTransaction } from "ethers";
import { MockContract } from "@defi-wonderland/smock";
import { FixtureFunc } from "hardhat-deploy/dist/types";
import { toUnpaddedHexString, ZERO_ADDRESS } from "../../src/utils";
import { facetMock, oneMillion } from "../utils";
import {
  Issuer, IssuerInitFacet, IssuerTopFacet, IssuerAccessFacet, IssuerFrontendFacet,
  IssuerTopFacet__factory, IssuerAccessFacet__factory, IssuerFrontendFacet__factory
} from "../../typechain";
import { ISSUER_FACETS } from "../../tasks/issuer";


export const ISSUER_INIT_DEFAULTS: IssuerInitFacet.InitializerParamsStruct = {
  member: ZERO_ADDRESS
};

interface IssuerFixtureOpts {
  readonly name: string;
  readonly deployer: string;
  readonly afterDeploy: (result: IssuerFixtureResult) => void
};
interface IssuerFixtureFuncArgs {
  readonly initWith: {};
  readonly opts: IssuerFixtureOpts;
};
interface IssuerFixtureResult {
  issuer: Issuer;
  initTx: ContractTransaction,
  topMock: MockContract<IssuerTopFacet>;
  accessMock: MockContract<IssuerAccessFacet>;
  frontendMock: MockContract<IssuerFrontendFacet>;
}

export const issuerFixtureFunc: FixtureFunc<IssuerFixtureResult, IssuerFixtureFuncArgs> =
  async (hre, opts) => {
    // opts could be `undefined`.
    if (!opts) throw 'You must provide Issuer fixture options.';
    const { opts: { deployer, name, afterDeploy }, initWith } = opts;
    // Deploy diamond.
    const { address: issuerAddr } = await hre.deployments.diamond.deploy(name, {
      from: deployer,
      owner: deployer,
      facets: [...ISSUER_FACETS, 'IssuerInitFacet'],
      // TODO: Find why this crashes.
      // deterministicSalt: deploymentSalt(hre)
    });

    // Provision the Issuer with a load of eth.
    await ethers.provider.send("hardhat_setBalance", [issuerAddr, toUnpaddedHexString(oneMillion)]);

    // Get a Issuer typed pointer.
    const issuer = await ethers.getContractAt<Issuer>('Issuer', issuerAddr);
    // Initialize the facet, and store the transaction result.
    const init = await ethers.getContractAt('IssuerInitFacet', issuerAddr);
    const initTx = await init.initialize({ ...ISSUER_INIT_DEFAULTS, ...initWith })
    // Build result.
    const result: IssuerFixtureResult = {
      issuer,
      initTx,
      topMock: await facetMock<IssuerTopFacet__factory>(issuer, 'IssuerTopFacet'),
      accessMock: await facetMock<IssuerAccessFacet__factory>(issuer, 'IssuerAccessFacet'),
      frontendMock: await facetMock<IssuerFrontendFacet__factory>(issuer, 'IssuerFrontendFacet')
    };
    // Callback!
    await afterDeploy.apply(this, [result]);
    // Final return.
    return result;
  }
