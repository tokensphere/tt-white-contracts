import 'dotenv/config';
import { BigNumber, ethers } from 'ethers';

const ZERO_ADDRESS = ethers.constants.AddressZero;
const ZERO_ACCOUNT_MOCK = { getAddress: () => ZERO_ADDRESS };
const DEPLOYMENT_SALT = '0xc9fa71d231c59b6ca2b8489684b740972f67176a9dafd18bd1412321114f1c7d';

function fromBaseUnit(amount: BigNumber, decimals: BigNumber): BigNumber {
  const ten = BigNumber.from(10);
  const exp = ten.pow(decimals);
  return amount.div(exp);
}

function toBaseUnit(rawAmount: BigNumber, decimals: BigNumber) {
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

function nodeUrl(networkName: string): string {
  if (networkName) {
    const uri = process.env['ETH_NODE_URI_' + networkName.toUpperCase()];
    if (uri && uri !== '') {
      return uri;
    }
  }

  let uri = process.env.ETH_NODE_URI;
  if (uri) {
    uri = uri.replace('{{networkName}}', networkName);
  }
  if (!uri || uri === '') {
    if (networkName === 'localhost') {
      return 'http://localhost:8545';
    }
    // throw new Error(`environment variable "ETH_NODE_URI" not configured `);
    return '';
  }
  if (uri.indexOf('{{') >= 0) {
    throw new Error(
      `invalid uri or network not supported by node provider : ${uri}`
    );
  }
  return uri;
}

function getMnemonic(networkName?: string): string {
  if (networkName) {
    const mnemonic = process.env['MNEMONIC_' + networkName.toUpperCase()];
    if (mnemonic && mnemonic !== '') {
      return mnemonic;
    }
  }

  const mnemonic = process.env.MNEMONIC;
  return (!mnemonic || mnemonic === '')
    ? 'test test test test test test test test test test test junk'
    : mnemonic;
}

function accounts(networkName?: string): { mnemonic: string } {
  return { mnemonic: getMnemonic(networkName) };
}


export {
  ZERO_ADDRESS, ZERO_ACCOUNT_MOCK, DEPLOYMENT_SALT,
  fromBaseUnit, toBaseUnit, toHexString,
  nodeUrl, getMnemonic, accounts
}
