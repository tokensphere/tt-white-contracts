import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { BigNumber } from 'ethers';
import { COMMON_DIAMOND_FACETS, fromBaseUnit, toBaseUnit, ZERO_ADDRESS } from '../src/utils';
import { DEPLOYER_FACTORY_COMMON } from '../src/utils';
import { Spc, Fast, FastInitFacet, Exchange } from '../typechain';
import { id } from 'ethers/lib/utils';

// Tasks.

interface FastDeployTaskParams {
  readonly governor: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly hasFixedSupply: boolean;
  readonly isSemiPublic: boolean;
  readonly txCredits: number;
  readonly mint?: number;
};

task('fast-deploy', 'Deploys a FAST')
  .addParam('governor', 'The address of the FAST governor', undefined, types.string)
  .addParam('name', 'The name for the new FAST', undefined, types.string)
  .addParam('symbol', 'The symbol for the new FAST', undefined, types.string)
  .addOptionalParam('decimals', 'The decimals for the new FAST', 18, types.int)
  .addParam('hasFixedSupply', 'The minting scheme for the new FAST', undefined, types.boolean)
  .addParam('isSemiPublic', 'Whether or not this FAST should be semi-public', undefined, types.boolean)
  .addParam('txCredits', 'The number of credits available for this new FAST', undefined, types.int)
  .addOptionalParam('mint', 'How many tokens to initially mint and transfer to the governor', undefined, types.int)
  .setAction(async (params: FastDeployTaskParams, hre: HardhatRuntimeEnvironment) => {
    const { ethers, getNamedAccounts } = hre;
    const { spcMember } = await getNamedAccounts();
    const spcMemberSigner = await ethers.getSigner(spcMember);

    const { fast, diamondName } = await deployFast(hre, params);
    console.log(`Fast diamond ${diamondName} deployed`, fast.address);
    const spcMemberFast = fast.connect(spcMemberSigner);
    console.log(`Registered ${diamondName} with SPC`);

    // At this point, we can start minting a few tokens if requested.
    if (params.mint) {
      const { symbol, decimals, baseAmount } = await fastMint(spcMemberFast, params.mint, 'Initial Mint');
      // Also add transfer credits.
      await fastAddTransferCredits(spcMemberFast, params.mint);
      console.log(`Minted ${symbol}: `);
      console.log(`  In base unit: =${baseAmount}`);
      console.log(`    Human unit: ~${fromBaseUnit(baseAmount, decimals)}(${decimals} decimals truncated)`);
    } else {
      // Add transfer credits.
      spcMemberFast.addTransferCredits(params.txCredits);
      console.log(`Added transfer credits`);
    }
  });

interface FastUpdateFacetsParams {
  readonly symbol: string;
}

task('fast-update-facets', 'Updates facets for a given FAST')
  .addPositionalParam('symbol', 'The FAST Token symbol to operate on', undefined, types.string)
  .setAction(async (params: FastUpdateFacetsParams, { deployments, getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts()
    const diamondName = `Fast${params.symbol}`;
    // Make sure that the fast is known from our tooling.
    const { address } = await deployments.get(diamondName);
    console.log(`Updating FAST diamond facets at ${address}...`);
    await deployments.diamond.deploy(diamondName, {
      from: deployer,
      facets: FAST_FACETS,
      deterministicSalt: DEPLOYER_FACTORY_COMMON.salt,
      log: true
    });
  });

interface FastMintParams {
  readonly symbol: string;
  readonly account: string;
  readonly amount: number;
  readonly ref: string;
};

task('fast-mint', 'Mints FASTs to a specified recipient')
  .addPositionalParam('symbol', 'The FAST Token symbol to operate on', undefined, types.string)
  .addParam('amount', 'The amount of tokens to mint', undefined, types.int)
  .addParam('ref', 'The reference to use for the minting operation', undefined, types.string)
  .setAction(async (params: FastMintParams, hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { spcMember } = await getNamedAccounts();
    const spcMemberSigner = await ethers.getSigner(spcMember);

    // Grab a handle to the token facet of the deployed fast.
    const fast = await fastBySymbol(hre, params.symbol);
    if (!fast) { throw (`No FAST registry can be found for symbol ${params.symbol}!`); }
    const spcMemberFast = fast.connect(spcMemberSigner);

    const { decimals, baseAmount } = await fastMint(spcMemberFast, params.amount, params.ref);
    console.log(`Minted ${params.symbol}: `);
    console.log(`  In base unit: = ${baseAmount} `);
    console.log(`    Human unit: ~${fromBaseUnit(baseAmount, decimals)} (${decimals} decimals truncated)`);
  });

interface FastAddTransferCreditsParams {
  readonly symbol: string;
  readonly credits: number;
};

task('fast-add-transfer-credits', 'Increases the transfer credits for a given FAST Token')
  .addPositionalParam('symbol', 'The FAST Token symbol to operate on', undefined, types.string)
  .addPositionalParam('credits', 'How many credits should be added', undefined, types.int)
  .setAction(async (params: FastAddTransferCreditsParams, hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { spcMember } = await getNamedAccounts();
    const spcMemberSigner = await ethers.getSigner(spcMember);

    // Grab a handle to the deployed fast.
    const fast = await fastBySymbol(hre, params.symbol);
    if (!fast) { throw (`No FAST registry can be found for symbol ${params.symbol}!`); }
    const spcMemberFast = fast.connect(spcMemberSigner);

    await fastAddTransferCredits(spcMemberFast, params.credits);
  });

interface FastBalanceParams {
  readonly symbol: string;
  readonly account: string;
};

task('fast-balance', 'Retrieves the balance of a given account')
  .addPositionalParam('symbol', 'The FAST symbol to operate on', undefined, types.string)
  .addParam('account', 'The account to retrieve the balance of', undefined, types.string)
  .setAction(async (params: FastBalanceParams, hre) => {
    // Grab a handle to the deployed fast.
    const fast = await fastBySymbol(hre, params.symbol);
    if (!fast) { throw (`No FAST registry can be found for symbol ${params.symbol}!`); }

    const [decimals, symbol, baseBalance] = await Promise.all([
      fast.decimals(), fast.symbol(), fast.balanceOf(params.account)
    ]);
    console.log(`${symbol} balance of ${params.account}: `);
    console.log(`  In base unit: = ${baseBalance} `);
    console.log(`    Human unit: ~${fromBaseUnit(baseBalance, decimals)} (${decimals} decimals truncated)`);
  });

// Reusable functions.

const FAST_FACETS = [
  ...COMMON_DIAMOND_FACETS,
  'FastTopFacet',
  'FastAccessFacet',
  'FastTokenFacet',
  'FastTokenInternalFacet',
  'FastHistoryFacet',
  'FastFrontendFacet'
];

interface FastDeployParams {
  readonly governor: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly hasFixedSupply: boolean;
  readonly isSemiPublic: boolean;
};

const deployFast = async (hre: HardhatRuntimeEnvironment, params: FastDeployParams, fromArtifacts: boolean = true)
  : Promise<{ fast: Fast; diamondName: string; }> => {
  const { ethers, deployments, getNamedAccounts } = hre;
  const { diamond } = deployments;
  const { deployer, spcMember } = await getNamedAccounts();
  // Grab a handle on the deployed SPC and Exchange contract.
  const spc = await ethers.getContract<Spc>('Spc');
  const exchange = await ethers.getContract<Exchange>('Exchange');

  // Make a unique diamond name for that FAST.
  const diamondName = `Fast${params.symbol}`;
  const deterministicSalt = id(`${DEPLOYER_FACTORY_COMMON.salt}:${diamondName}`);

  // Check that symbol isn't taken.
  let existingAddr: string;
  if (fromArtifacts)
    existingAddr = (await ethers.getContract(diamondName)).address;
  else
    existingAddr = await spc.fastBySymbol(params.symbol);

  if (existingAddr != ZERO_ADDRESS) {
    throw `It seems that a FAST was already deployed at ${existingAddr} with symbol ${params.symbol}!`;
  }

  // Deploy the diamond with an additional initialization facet.
  const { address } = await diamond.deploy(diamondName, {
    from: deployer,
    owner: deployer,
    facets: FAST_FACETS,
    execute: {
      contract: 'FastInitFacet',
      methodName: 'initialize',
      args: [{
        spc: spc.address,
        exchange: exchange.address,
        governor: params.governor,
        name: params.name,
        symbol: params.symbol,
        decimals: params.decimals,
        hasFixedSupply: params.hasFixedSupply,
        isSemiPublic: params.isSemiPublic
      }]
    },
    deterministicSalt,
    log: true
  });

  // Register the new FAST with the SPC.
  const spcMemberSigner = await ethers.getSigner(spcMember);
  await (await spc.connect(spcMemberSigner).registerFast(address)).wait();

  // Return a handle to the diamond.
  const fast = await ethers.getContract<Fast>(diamondName);
  return { fast, diamondName };
}

const fastBySymbol = async ({ ethers }: HardhatRuntimeEnvironment, symbol: string, fromArtifacts: boolean = true) => {
  if (fromArtifacts)
    return await ethers.getContract<Fast>(`Fast${symbol}`);
  else {
    // Grab a handle on the deployed SPC contract.
    const spc = await ethers.getContract<Spc>('Spc');
    // Grab a handle to the deployed fast.
    const fastAddr = await spc.fastBySymbol(symbol);
    // Not found?
    if (fastAddr == ZERO_ADDRESS) { return undefined; }
    return await ethers.getContractAt<Fast>('Fast', fastAddr);
  }
};

const fastMint = async (fast: Fast, amount: number | BigNumber, ref: string) => {
  const [decimals, symbol] = await Promise.all([fast.decimals(), fast.symbol()]);
  const baseAmount = toBaseUnit(BigNumber.from(amount), decimals);
  await (await fast.mint(baseAmount, ref)).wait();
  return { symbol, decimals, baseAmount };
}

const fastAddTransferCredits = async (fast: Fast, credits: number | BigNumber) => {
  const decimals = await fast.decimals();
  await (await fast.addTransferCredits(toBaseUnit(BigNumber.from(credits), decimals))).wait();
}

export { FAST_FACETS, deployFast, fastBySymbol, fastMint, fastAddTransferCredits };
