import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { deployments, ethers, getNamedAccounts } from "hardhat";
import { Marketplace, IERC20 } from "../typechain";
import { FastAutomatonPrivilege, toBaseUnit, ZERO_ADDRESS } from "../src/utils";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  // We only want to do this in local development nodes.
  const { name: netName } = hre.network;
  if (netName !== "hardhat" && netName !== "localhost" && netName !== "dev") {
    return;
  }
  console.log("------------------------------------------------ 90_seedDevEnv");

  const { deployer, fastGovernor, issuerMember, automaton, user1, user2, user3, user4, user5, user6, user7, user8, user9 } =
    await getNamedAccounts();
  // Grab various accounts.
  const issuerMemberSigner = await ethers.getSigner(issuerMember);
  const fastGovernorSigner = await ethers.getSigner(fastGovernor);
  // Grab handles to the Marketplace.
  const marketplace = await ethers.getContract<Marketplace>("Marketplace");
  const issuerMemberMarketplace = marketplace.connect(issuerMemberSigner);

  console.log("Deploying DDD...");
  {
    const ddd = await deployments.deploy("ERC20", {
      from: deployer,
      args: ["Dummy Dumb Dividends", "DDD"],
      deterministicDeployment: true,
    });
    console.log(`DDD deployed at ${ddd.address}.`);

    console.log("Minting X DDD tokens... to user1");
    const dddToken = await ethers.getContractAt([
      "function mint(address, uint256)"
    ], ddd.address);
    await (await dddToken.connect(issuerMemberSigner).mint(user1, 5000000)).wait();
    console.log("done...");
  }

  console.log("Adding user[1-10] to the Marketplace as members...");
  for (const addr of [user1, user2, user3, user4, user5, user6, user7, user8, user9]) {
    if (!(await marketplace.isMember(addr))) {
      console.log(`  ${addr}...`);
      await (await issuerMemberMarketplace.addMember(addr)).wait();
    }
  }

  const governedF01 = (await ethers.getContract("FastF01")).connect(fastGovernorSigner);
  const issuerMemberF01 = (await ethers.getContract("FastF01")).connect(issuerMemberSigner);
  console.log("Adding automaton to F01 FAST...");
  await issuerMemberF01.setAutomatonPrivileges(automaton, FastAutomatonPrivilege.ManageDistributions);
  console.log("Adding user[1-5] as members of the F01 FAST...");
  for (const addr of [user1, user2, user3, user4, user5]) {
    console.log(`  ${addr}...`);
    await (await governedF01.addMember(addr)).wait();
  }
  console.log("Transferring F01 to user[1-3]...");
  for (const [index, addr] of [user1, user2, user3].entries()) {
    console.log(`  ${addr} ${index}...`);
    await (
      await issuerMemberF01.transferFromWithRef(
        ZERO_ADDRESS,
        addr,
        toBaseUnit(1_000 * (index + 1), 18),
        `Transfer ${index + 1}`,
      )
    ).wait();
  }

  const governedF02 = (await ethers.getContract("FastF02")).connect(fastGovernorSigner);
  console.log("Adding user[3-7] as members of the F02 FAST...");
  for (const addr of [user3, user4, user5, user6, user7]) {
    console.log(`  ${addr}...`);
    await (await governedF02.addMember(addr)).wait();
  }
};
func.tags = ["SeedDevEnv"];
export default func;
