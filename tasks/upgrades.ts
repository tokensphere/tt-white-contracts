import { task } from "hardhat/config";
import { Issuer } from "../typechain";

// Tasks.

task("update-facets", "Updates facets of all deployed contracts").setAction(
  async (_, hre) => {
    const { run } = hre;
    // Update issuer and marketplace facets.
    await run("issuer-update-facets");
    await run("marketplace-update-facets");

    // Iterate over all deployment artifacts for the current network.
    const issuer = await hre.ethers.getContract<Issuer>("Issuer");
    const [allFastDetails] = await issuer.paginateDetailedFasts(0, 1000);
    for (const { symbol } of allFastDetails)
      await run(`fast-update-facets`, { symbol });
  }
);
