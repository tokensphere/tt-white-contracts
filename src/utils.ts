import { BigNumber } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_ACCOUNT_MOCK = { getAddress: () => ZERO_ADDRESS };

function checkNetwork({ network }: HardhatRuntimeEnvironment, doThrow: boolean = true): boolean {
  if (network.name === 'hardhat') {
    console.warn(
      'You are running the task with Hardhat network, which gets automatically created' +
      ' and destroyed every time. Please use the Hardhat option `--network localhost`.'
    );
    if (doThrow) { throw 'Wrong network' }
    else { return false; }
  }
  return true;
}

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

export {
  ZERO_ADDRESS, ZERO_ACCOUNT_MOCK,
  checkNetwork,
  fromBaseUnit, toBaseUnit, toHexString
}
