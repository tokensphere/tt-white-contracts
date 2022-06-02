import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { BigNumber } from 'ethers';
import { fromBaseUnit, toBaseUnit, ZERO_ADDRESS } from '../src/utils';
import { DEPLOYMENT_SALT } from '../src/utils';
import { Fast, FastInitFacet, FastTokenFacet, Spc } from '../typechain';

// Tasks.

interface FastDeployParams {
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
  .setAction(async (params: FastDeployParams, hre: HardhatRuntimeEnvironment) => {
    const { ethers, getNamedAccounts } = hre;
    const { spcMember } = await getNamedAccounts();
    const spcMemberSigner = await ethers.getSigner(spcMember);

    const { fast, diamondName } = await deployFast(hre, params);
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

interface FastMintParams {
  readonly fastSymbol: string;
  readonly account: string;
  readonly amount: number;
  readonly ref: string;
};

task('fast-mint', 'Mints FASTs to a specified recipient')
  .addPositionalParam('fastSymbol', 'The FAST Token symbol to operate on', undefined, types.string)
  .addParam('amount', 'The amount of tokens to mint', undefined, types.int)
  .addParam('ref', 'The reference to use for the minting operation', undefined, types.string)
  .setAction(async (params: FastMintParams, hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { spcMember } = await getNamedAccounts();
    const spcMemberSigner = await ethers.getSigner(spcMember);

    // Grab a handle to the token facet of the deployed fast.
    const fast = await fastBySymbol(hre, params.fastSymbol);
    if (!fast) { throw (`No FAST registry can be found for symbol ${params.fastSymbol}!`); }
    const spcMemberFast = fast.connect(spcMemberSigner);

    const { symbol, decimals, baseAmount } = await fastMint(spcMemberFast, params.amount, params.ref);
    console.log(`Minted ${symbol}: `);
    console.log(`  In base unit: = ${baseAmount} `);
    console.log(`    Human unit: ~${fromBaseUnit(baseAmount, decimals)} (${decimals} decimals truncated)`);
  });

interface FastAddTransferCreditsParamms {
  readonly fastSymbol: string;
  readonly credits: number;
};

task('fast-add-transfer-credits', 'Increases the transfer credits for a given FAST Token')
  .addPositionalParam('fastSymbol', 'The FAST Token symbol to operate on', undefined, types.string)
  .addPositionalParam('credits', 'How many credits should be added', undefined, types.int)
  .setAction(async (params: FastAddTransferCreditsParamms, hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { spcMember } = await getNamedAccounts();
    const spcMemberSigner = await ethers.getSigner(spcMember);

    // Grab a handle to the deployed fast.
    const fast = await fastBySymbol(hre, params.fastSymbol);
    if (!fast) { throw (`No FAST registry can be found for symbol ${params.fastSymbol}!`); }
    const spcMemberFast = fast.connect(spcMemberSigner);

    await fastAddTransferCredits(spcMemberFast, params.credits);
  });

interface FastBalanceParams {
  readonly fastSymbol: string;
  readonly account: string;
};

const FACETS = [
  'FastFacet',
  'FastAccessFacet',
  'FastTokenFacet',
  'FastHistoryFacet'
];

task('fast-balance', 'Retrieves the balance of a given account')
  .addPositionalParam('fastSymbol', 'The FAST symbol to operate on', undefined, types.string)
  .addParam('account', 'The account to retrieve the balance of', undefined, types.string)
  .setAction(async (params: FastBalanceParams, hre) => {
    // Grab a handle to the deployed fast.
    const fast = await fastBySymbol(hre, params.fastSymbol);
    if (!fast) { throw (`No FAST registry can be found for symbol ${params.fastSymbol}!`); }

    const [decimals, symbol, baseBalance] = await Promise.all([
      fast.decimals(), fast.symbol(), fast.balanceOf(params.account)
    ]);
    console.log(`${symbol} balance of ${params.account}: `);
    console.log(`  In base unit: = ${baseBalance} `);
    console.log(`    Human unit: ~${fromBaseUnit(baseBalance, decimals)} (${decimals} decimals truncated)`);
  });

async function deployFast(hre: HardhatRuntimeEnvironment, params: FastDeployParams) {
  const { ethers, deployments, getNamedAccounts } = hre;
  const { diamond } = deployments;
  const { deployer, spcMember } = await getNamedAccounts();
  const spcMemberSigner = await ethers.getSigner(spcMember);

  // Grab a handle on the deployed SPC contract.
  const spcAddr = await (await deployments.get('Spc')).address;
  const spc = await hre.ethers.getContractAt('Spc', spcAddr) as Spc;
  const exchangeAddr = await (await deployments.get('Spc')).address;

  // Check that symbol isn't taken.
  const existingAddr = await spc.fastBySymbol(params.symbol);
  if (existingAddr != ZERO_ADDRESS) {
    throw `It seems that a FAST was already deployed at ${existingAddr} with symbol ${params.symbol}!`;
  }

  const diamondName = `Fast_${params.symbol}`;

  // Deploy the fast with an additional initialization facet.
  const { address: fastAddr } = await diamond.deploy(diamondName, {
    from: deployer,
    owner: deployer,
    deterministicSalt: DEPLOYMENT_SALT,
    facets: ['FastInitFacet', ...FACETS],
    log: true
  });
  console.log(`Fast diamond ${diamondName} deployed`, fastAddr);

  // Grab a handle to the diamond's token facet.
  const fast = await ethers.getContractAt('Fast', fastAddr) as Fast;
  const init = await ethers.getContractAt('FastInitFacet', fastAddr) as FastInitFacet;

  // Call the initialization facet.
  await init.initialize({
    spc: spcAddr,
    exchange: exchangeAddr,
    governor: params.governor,
    name: params.name,
    symbol: params.symbol,
    decimals: params.decimals,
    hasFixedSupply: params.hasFixedSupply,
    isSemiPublic: params.isSemiPublic
  });

  // Perform a diamond cut to subtract the initialization facet.
  const result = await diamond.deploy(diamondName, {
    from: deployer,
    owner: deployer,
    deterministicSalt: DEPLOYMENT_SALT,
    facets: FACETS,
    log: true
  });

  // Register the new FAST with the SPC.
  await spc.connect(spcMemberSigner).registerFast(fastAddr)
  return { fast, diamondName };
}

async function fastBySymbol(hre: HardhatRuntimeEnvironment, symbol: string) {
  const { deployments } = hre;

  // Grab a handle on the deployed SPC contract.
  const spcAddr = await (await deployments.get('Spc')).address;
  const spc = await hre.ethers.getContractAt('Spc', spcAddr);

  // Grab a handle to the deployed fast.
  const fastAddr = await spc.fastBySymbol(symbol);
  if (fastAddr == ZERO_ADDRESS) {
    return undefined;
  }
  return await hre.ethers.getContractAt('Fast', fastAddr) as Fast;
};

async function fastMint(fast: Fast, amount: number | BigNumber, ref: string) {
  const [decimals, symbol] = await Promise.all([fast.decimals(), fast.symbol()]);
  const baseAmount = toBaseUnit(BigNumber.from(amount), decimals);
  await fast.mint(baseAmount, ref);
  return { symbol, decimals, baseAmount };
}

async function fastAddTransferCredits(fast: Fast, credits: number | BigNumber) {
  const decimals = await fast.decimals();
  await fast.addTransferCredits(toBaseUnit(BigNumber.from(credits), decimals));
}

export { deployFast, fastBySymbol, fastMint, fastAddTransferCredits };
