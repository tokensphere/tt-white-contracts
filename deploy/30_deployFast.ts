import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getNamedAccounts } from "hardhat";
import { deployFast } from "../tasks/fast";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  console.log("----------------------------------- 30_deployFast");
  await deployFast(hre);
};
func.tags = ["DeployFast"];
export default func;
