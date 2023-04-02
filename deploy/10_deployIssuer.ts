import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { deployIssuer } from "../tasks/issuer";
import { getNamedAccounts } from "hardhat";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  console.log("------------------------------------------------ 10_deployIssuer");

  const { issuerMember } = await getNamedAccounts();
  await deployIssuer(hre, issuerMember);
};
func.tags = ["DeployIssuer"];
export default func;
