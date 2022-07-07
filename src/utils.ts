import fs from 'fs';
import { BigNumber, ethers } from 'ethers';

const ZERO_ADDRESS = ethers.constants.AddressZero;
const ZERO_ACCOUNT_MOCK = { getAddress: () => ZERO_ADDRESS };

const DEPLOYER_FACTORY_COMMON = {
  deployer: '0xfa570a9Fd418FF0B8A5C792497a79059070A3A8e',
  factory: '0x6DF2D25d8C6FD680730ee658b530A05a99BB769a',
  funding: '10000000000000000',
  salt: '0x59fb51d231c59b6ca2b8489684b740972f67176a9dafd18bd1412321114f1c7d'
}

const COMMON_DIAMOND_FACETS = [
  'ERC165Facet'
];

function fromBaseUnit(amount: BigNumber | string | number, decimals: BigNumber | string | number): BigNumber {
  amount = BigNumber.from(amount);
  decimals = BigNumber.from(decimals);
  const ten = BigNumber.from(10);
  const exp = ten.pow(decimals);
  return amount.div(exp);
}

function toBaseUnit(rawAmount: BigNumber | string | number, decimals: BigNumber | string | number) {
  rawAmount = BigNumber.from(rawAmount);
  decimals = BigNumber.from(decimals);

  let amount = rawAmount.toString();
  const ten = BigNumber.from(10);
  const base = ten.pow(BigNumber.from(decimals));

  // Is it negative?
  const negative = (amount.substring(0, 1) === '-');
  if (negative) {
    amount = amount.substring(1);
  }
  if (amount === '.') {
    throw new Error(`Invalid amount ${amount} cannot be converted to base unit with ${decimals} decimals.`);
  }

  // Split it into a whole and fractional part
  let [wholeStr, fractionStr] = amount.split('.');
  if (!wholeStr) { wholeStr = '0'; }
  if (!fractionStr) { fractionStr = '0'; }
  if (BigNumber.from(fractionStr.length) > decimals) {
    throw new Error('Too many decimal places');
  }
  while (BigNumber.from(fractionStr.length) < decimals) {
    fractionStr += '0';
  }

  const whole = BigNumber.from(wholeStr);
  const fraction = BigNumber.from(fractionStr);
  let wei = (whole.mul(base)).add(fraction);
  if (negative) { wei = wei.mul(-1); }

  return BigNumber.from(wei.toString());
}

function toHexString(amount: BigNumber) {
  return amount.toHexString().replace(/0x0+/, '0x');
}

// =================================================== //

const nodeUrl = (networkName: string): string =>
  process.env[`ETH_NODE_URI_${networkName.toUpperCase()}`] as string;

const accounts = (networkName: string): string[] => {
  try {
    return JSON.parse(fs.readFileSync(`./conf/keys.${networkName}.json`, 'utf8'));
  } catch (_error) {
    return [];
  }
}

export {
  ZERO_ADDRESS, ZERO_ACCOUNT_MOCK, DEPLOYER_FACTORY_COMMON, COMMON_DIAMOND_FACETS,
  fromBaseUnit, toBaseUnit, toHexString,
  nodeUrl, accounts
}
