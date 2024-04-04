import fs from "fs";
import { BigNumber, ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { JsonFragment } from "@ethersproject/abi";

export const ZERO_ADDRESS = ethers.constants.AddressZero;
export const ZERO_ACCOUNT_MOCK = { getAddress: () => ZERO_ADDRESS };

export const DEPLOYER_FACTORY_COMMON = {
  deployer: "0xfa570a9Fd418FF0B8A5C792497a79059070A3A8e",
  factory: "0x6DF2D25d8C6FD680730ee658b530A05a99BB769a",
  funding: "10000000000000000",
};

// Marketplace privilege bits.
export const MarketplaceAutomatonPrivilege = {
  ManageMembers: 1,
};

// FAST privilege bits.
export const FastAutomatonPrivilege = {
  ManageMembers: 1,
  ManageDistributions: 2,
  ManageCrowdfunds: 4,
};

export const deploymentSalt = ({
  network: { name: netName },
}: HardhatRuntimeEnvironment) => {
  // Staging or production environments.
  if (netName !== "hardhat" && netName !== "localhost" && netName !== "dev") {
    const salt = process.env.DEPLOYMENT_SALT;
    if (salt === undefined) throw Error("DEPLOYMENT_SALT must be set.");
    return salt;
  }
  // Local environments.
  else {
    return "0x59fb51d231c59b6ca2b8489684b740972f67176a9dafd18bd1412321114f1c7d";
  }
};

// Attempts to adjust the gas based on the current network.
export const gasAdjustments = async ({
  network: { name: netName },
  ethers: { provider },
}: HardhatRuntimeEnvironment): Promise<{}> => {
  // Staging or production environments.
  if (netName !== "hardhat" && netName !== "localhost" && netName !== "dev") {
    const rawMaxPriorityFeePerGas = await provider.send("eth_maxPriorityFeePerGas", [])
    const maxPriorityFeePerGas = parseInt(rawMaxPriorityFeePerGas, 16);
    // Set a high static base fee.
    const baseFee = 20;
    return {
      maxFeePerGas: BigNumber.from(baseFee * 2 + maxPriorityFeePerGas),
      maxPriorityFeePerGas: BigNumber.from(maxPriorityFeePerGas),
    };
  } else {
    // No adjustment needed.
    return {};
  }
};

// Transforms an ABIElement
export const abiElementToSignature = (abiElement: JsonFragment): string =>
  ethers.utils.Fragment.fromObject(abiElement).format();

export type AbiIgnoreList = ReadonlyArray<[Readonly<string>, Readonly<string>]>;
export const abiFilter =
  (ignoreList: AbiIgnoreList) =>
    (abiElement: any, index: number, abi: any, contractName: string) =>
      // Find the first filter that matches...
      !ignoreList.some(
        ([nameMatcher, sig]) =>
          // If the name matches the name matcher and the function signature, we can set it to "ignore".
          contractName.match(nameMatcher) &&
          abiElementToSignature(abiElement) === sig
      );

export const fromBaseUnit = (
  amount: BigNumber | string | number,
  decimals: BigNumber | string | number
): BigNumber => {
  amount = BigNumber.from(amount);
  decimals = BigNumber.from(decimals);
  const ten = BigNumber.from(10);
  const exp = ten.pow(decimals);
  return amount.div(exp);
};

export const toBaseUnit = (
  rawAmount: BigNumber | string | number,
  decimals: BigNumber | string | number
) => {
  rawAmount = BigNumber.from(rawAmount);
  decimals = BigNumber.from(decimals);

  if (BigNumber.from(decimals).eq(0)) {
    return BigNumber.from(rawAmount);
  }

  let amount = rawAmount.toString();
  const ten = BigNumber.from(10);
  const base = ten.pow(BigNumber.from(decimals));

  // Is it negative?
  const negative = amount.substring(0, 1) === "-";
  if (negative) {
    amount = amount.substring(1);
  }
  if (amount === ".") {
    throw new Error(
      `Invalid amount ${amount} cannot be converted to base unit with ${decimals} decimals.`
    );
  }

  // Split it into a whole and fractional part
  let [wholeStr, fractionStr] = amount.split(".");
  if (!wholeStr) {
    wholeStr = "0";
  }
  if (!fractionStr) {
    fractionStr = "0";
  }
  if (BigNumber.from(fractionStr.length) > decimals) {
    throw new Error("Too many decimal places");
  }
  while (BigNumber.from(fractionStr.length) < decimals) {
    fractionStr += "0";
  }

  const whole = BigNumber.from(wholeStr);
  const fraction = BigNumber.from(fractionStr);
  let wei = whole.mul(base).add(fraction);
  if (negative) {
    wei = wei.mul(-1);
  }

  return BigNumber.from(wei.toString());
};

export const toUnpaddedHexString = (amount: BigNumber) =>
  amount.toHexString().replace(/0x0+/, "0x");

// =================================================== //

export const accounts = (networkName: string): string[] => {
  try {
    return JSON.parse(
      fs.readFileSync(`./conf/keys.${networkName}.json`, "utf8")
    );
  } catch (_error) {
    console.warn(`Cannot read keys file at conf/keys.${networkName}.json .`);
    return [];
  }
};
