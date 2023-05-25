import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BigNumber } from "ethers";
import {
  COMMON_DIAMOND_FACETS,
  deploymentSalt,
  fromBaseUnit,
  toBaseUnit,
  ZERO_ADDRESS,
} from "../src/utils";
import { Issuer, Fast, Marketplace } from "../typechain";
import { id } from "ethers/lib/utils";

// Tasks.

interface FastDeployTaskParams {
  readonly governor: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly hasFixedSupply: boolean;
  readonly isSemiPublic: boolean;
  readonly mint?: number;
}

task("fast-deploy", "Deploys a FAST")
  .addParam(
    "governor",
    "The address of the FAST governor",
    undefined,
    types.string
  )
  .addParam("name", "The name for the new FAST", undefined, types.string)
  .addParam("symbol", "The symbol for the new FAST", undefined, types.string)
  .addOptionalParam("decimals", "The decimals for the new FAST", 18, types.int)
  .addParam(
    "hasFixedSupply",
    "The minting scheme for the new FAST",
    undefined,
    types.boolean
  )
  .addParam(
    "isSemiPublic",
    "Whether or not this FAST should be semi-public",
    undefined,
    types.boolean
  )
  .addOptionalParam(
    "mint",
    "How many tokens to initially mint and transfer to the governor",
    undefined,
    types.int
  )
  .setAction(
    async (params: FastDeployTaskParams, hre: HardhatRuntimeEnvironment) => {
      const { ethers, getNamedAccounts } = hre;
      const { issuerMember } = await getNamedAccounts();
      const issuerMemberSigner = await ethers.getSigner(issuerMember);

      const { fast, diamondName } = await deployFast(hre, params);
      console.log(`Fast diamond ${diamondName} deployed`, fast.address);
      const issuerMemberFast = fast.connect(issuerMemberSigner);
      console.log(`Registered ${diamondName} with Issuer`);

      // At this point, we can start minting a few tokens if requested.
      if (params.mint) {
        const { symbol, decimals, baseAmount } = await fastMint(
          issuerMemberFast,
          params.mint,
          "Initial Mint"
        );
        console.log(`Minted ${symbol}: `);
        console.log(`  In base unit: =${baseAmount}`);
        console.log(
          `    Human unit: ~${fromBaseUnit(
            baseAmount,
            decimals
          )}(${decimals} decimals truncated)`
        );
      }
    }
  );

interface FastUpdateFacetsParams {
  readonly symbol: string;
}

task("fast-update-facets", "Updates facets for a given FAST")
  .addPositionalParam(
    "symbol",
    "The FAST Token symbol to operate on",
    undefined,
    types.string
  )
  .setAction(
    async (params: FastUpdateFacetsParams, hre: HardhatRuntimeEnvironment) => {
      const { deployments, getNamedAccounts } = hre;
      const { deployer } = await getNamedAccounts();
      const diamondName = `Fast${params.symbol}`;
      // Make sure that the fast is known from our tooling.
      const { address } = await deployments.get(diamondName);
      console.log(`Updating ${diamondName} diamond facets at ${address}...`);
      await deployments.diamond.deploy(diamondName, {
        from: deployer,
        facets: FAST_FACETS,
        deterministicSalt: deploymentSalt(hre),
        log: true,
      });
    }
  );

interface FastMintParams {
  readonly symbol: string;
  readonly account: string;
  readonly amount: number;
  readonly ref: string;
}

task("fast-mint", "Mints FASTs to a specified recipient")
  .addPositionalParam(
    "symbol",
    "The FAST Token symbol to operate on",
    undefined,
    types.string
  )
  .addParam("amount", "The amount of tokens to mint", undefined, types.int)
  .addParam(
    "ref",
    "The reference to use for the minting operation",
    undefined,
    types.string
  )
  .setAction(async (params: FastMintParams, hre: HardhatRuntimeEnvironment) => {
    const { ethers, getNamedAccounts } = hre;
    const { issuerMember } = await getNamedAccounts();
    const issuerMemberSigner = await ethers.getSigner(issuerMember);

    // Grab a handle to the token facet of the deployed fast.
    const fast = await fastBySymbol(hre, params.symbol);
    if (!fast) {
      throw Error(`No FAST registry can be found for symbol ${params.symbol}!`);
    }
    const issuerMemberFast = fast.connect(issuerMemberSigner);

    console.log(`Minting ${params.amount} for FAST ${params.symbol}...`);
    const { decimals, baseAmount } = await fastMint(
      issuerMemberFast,
      params.amount,
      params.ref
    );
    console.log(`Minted ${params.symbol}: `);
    console.log(`  In base unit: = ${baseAmount} `);
    console.log(
      `    Human unit: ~${fromBaseUnit(
        baseAmount,
        decimals
      )} (${decimals} decimals truncated)`
    );
  });

interface FastBalanceParams {
  readonly symbol: string;
  readonly account: string;
}

task("fast-balance", "Retrieves the balance of a given account")
  .addPositionalParam(
    "symbol",
    "The FAST symbol to operate on",
    undefined,
    types.string
  )
  .addParam(
    "account",
    "The account to retrieve the balance of",
    undefined,
    types.string
  )
  .setAction(
    async (params: FastBalanceParams, hre: HardhatRuntimeEnvironment) => {
      // Grab a handle to the deployed fast.
      const fast = await fastBySymbol(hre, params.symbol);
      if (!fast) {
        throw Error(
          `No FAST registry can be found for symbol ${params.symbol}!`
        );
      }

      const [decimals, symbol, baseBalance] = await Promise.all([
        fast.decimals(),
        fast.symbol(),
        fast.balanceOf(params.account),
      ]);
      console.log(`${symbol} balance of ${params.account}: `);
      console.log(`  In base unit: = ${baseBalance} `);
      console.log(
        `    Human unit: ~${fromBaseUnit(
          baseBalance,
          decimals
        )} (${decimals} decimals truncated)`
      );
    }
  );

// Reusable functions.

const FAST_FACETS = [
  ...COMMON_DIAMOND_FACETS,
  "FastTopFacet",
  "FastAccessFacet",
  "FastAutomatonsFacet",
  "FastTokenFacet",
  "FastHistoryFacet",
  "FastFrontendFacet",
  "FastDistributionsFacet",
  "FastCrowdfundsFacet",
];

interface FastDeployParams {
  readonly governor: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly hasFixedSupply: boolean;
  readonly isSemiPublic: boolean;
}

const deployFast = async (
  hre: HardhatRuntimeEnvironment,
  params: FastDeployParams
): Promise<{ fast: Fast; diamondName: string }> => {
  const { ethers, deployments, getNamedAccounts } = hre;
  const { diamond } = deployments;
  const { deployer, issuerMember } = await getNamedAccounts();
  // Grab a handle on the deployed Issuer and Marketplace contract.
  const issuer = await ethers.getContract<Issuer>("Issuer");
  const marketplace = await ethers.getContract<Marketplace>("Marketplace");
  const issuerMemberSigner = await ethers.getSigner(issuerMember);

  // Make a unique diamond name for that FAST.
  const diamondName = `Fast${params.symbol}`;
  const deterministicSalt = id(`${deploymentSalt(hre)}:${diamondName}`);

  let deploy = await deployments.getOrNull(diamondName);
  if (deploy) {
    console.log(`${diamondName} deployment found, skipping deployment.`);
  } else {
    console.log(`Deploying ${diamondName} with governor ${params.governor}...`);
    // Deploy the diamond with an additional initialization facet.
    deploy = await diamond.deploy(diamondName, {
      from: deployer,
      owner: deployer,
      facets: FAST_FACETS,
      execute: {
        contract: "FastInitFacet",
        methodName: "initialize",
        args: [
          {
            issuer: issuer.address,
            marketplace: marketplace.address,
            name: params.name,
            symbol: params.symbol,
            decimals: params.decimals,
            hasFixedSupply: params.hasFixedSupply,
            isSemiPublic: params.isSemiPublic,
          },
        ],
      },
      deterministicSalt,
      log: true,
    });
  }

  // Register the new FAST with the Issuer.
  if ((await issuer.fastBySymbol(params.symbol)) !== ZERO_ADDRESS) {
    console.log(
      `${diamondName} already registered with the Issuer, skipping registration.`
    );
  } else {
    console.log(
      `Registering ${diamondName} at ${deploy.address} with the Issuer...`
    );
    await (
      await issuer.connect(issuerMemberSigner).registerFast(deploy.address)
    ).wait();
  }

  // Return a handle to the diamond.
  const fast = await ethers.getContract<Fast>(diamondName);

  // Add governor to the FAST.
  console.log(`Adding governor ${params.governor} to ${diamondName}...`);
  await fast.connect(issuerMemberSigner).addGovernor(params.governor);

  return { fast, diamondName };
};

const fastBySymbol = async (
  { ethers }: HardhatRuntimeEnvironment,
  symbol: string,
  fromArtifacts: boolean = true
) => {
  if (fromArtifacts)
    return (await ethers.getContractOrNull<Fast>(`Fast${symbol}`)) || undefined;
  else {
    // Grab a handle on the deployed Issuer contract.
    const issuer = await ethers.getContract<Issuer>("Issuer");
    // Grab a handle to the deployed fast.
    const fastAddr = await issuer.fastBySymbol(symbol);
    // Not found?
    if (fastAddr === ZERO_ADDRESS) {
      return undefined;
    }
    return await ethers.getContractAt<Fast>("Fast", fastAddr);
  }
};

const fastMint = async (
  fast: Fast,
  amount: number | BigNumber,
  ref: string
) => {
  const [decimals, symbol] = await Promise.all([
    fast.decimals(),
    fast.symbol(),
  ]);
  const baseAmount = toBaseUnit(BigNumber.from(amount), decimals);
  await (await fast.mint(baseAmount, ref)).wait();
  return { symbol, decimals, baseAmount };
};

export { FAST_FACETS, deployFast, fastBySymbol, fastMint };
