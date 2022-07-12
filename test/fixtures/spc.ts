import { ethers } from "hardhat";
import { ContractTransaction } from "ethers";
import { MockContract } from "@defi-wonderland/smock";
import { FixtureFunc } from "hardhat-deploy/dist/types";
import { deploymentSalt, toHexString, ZERO_ADDRESS } from "../../src/utils";
import { facetMock, oneMillion } from "../utils";
import {
  Spc, SpcInitFacet, SpcTopFacet, SpcAccessFacet, SpcFrontendFacet,
  SpcTopFacet__factory, SpcAccessFacet__factory, SpcFrontendFacet__factory
} from "../../typechain";
import { SPC_FACETS } from "../../tasks/spc";


export const SPC_INIT_DEFAULTS: SpcInitFacet.InitializerParamsStruct = {
  member: ZERO_ADDRESS
};

interface SpcFixtureOpts {
  readonly name: string;
  readonly deployer: string;
  readonly afterDeploy: (result: SpcFixtureResult) => void
};
interface SpcFixtureFuncArgs {
  readonly initWith: {};
  readonly opts: SpcFixtureOpts;
};
interface SpcFixtureResult {
  spc: Spc;
  initTx: ContractTransaction,
  topMock: MockContract<SpcTopFacet>;
  accessMock: MockContract<SpcAccessFacet>;
  frontendMock: MockContract<SpcFrontendFacet>;
}

export const spcFixtureFunc: FixtureFunc<SpcFixtureResult, SpcFixtureFuncArgs> =
  async (hre, opts) => {
    // opts could be `undefined`.
    if (!opts) throw 'You must provide SPC fixture options.';
    const { opts: { deployer, name, afterDeploy }, initWith } = opts;
    // Deploy empty diamond.
    const { address: spcAddr } = await hre.deployments.diamond.deploy(name, {
      from: deployer,
      owner: deployer,
      facets: [...SPC_FACETS, 'SpcInitFacet'],
      deterministicSalt: deploymentSalt(hre)
    });

    // Provision the SPC with a load of eth.
    await ethers.provider.send("hardhat_setBalance", [spcAddr, toHexString(oneMillion)]);

    // Get a SPC typed pointer.
    const spc = await ethers.getContractAt<Spc>('Spc', spcAddr);
    // Initialize the facet, and store the transaction result.
    const init = await ethers.getContractAt('SpcInitFacet', spcAddr);
    const initTx = await init.initialize({ ...SPC_INIT_DEFAULTS, ...initWith })
    // Build result.
    const result: SpcFixtureResult = {
      spc,
      initTx,
      topMock: await facetMock<SpcTopFacet__factory>(spc, 'SpcTopFacet'),
      accessMock: await facetMock<SpcAccessFacet__factory>(spc, 'SpcAccessFacet'),
      frontendMock: await facetMock<SpcFrontendFacet__factory>(spc, 'SpcFrontendFacet')
    };
    // Callback!
    await afterDeploy.apply(this, [result]);
    // Final return.
    return result;
  }
