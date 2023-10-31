import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { deployPaymaster } from "../tasks/paymaster";
import { deployments } from "hardhat";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  console.log("----------------------------------- 30_deployPaymaster");

  await deployPaymaster(
    hre,
    (await deployments.get("Marketplace")).address,
    (await deployments.get("Issuer")).address
  );
};
func.tags = ["DeployPaymaster"];
export default func;
