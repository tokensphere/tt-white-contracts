import { task } from "hardhat/config";
import fs from "fs";

// Tasks.

task("update-facets", "Updates facets of all deployed contracts").setAction(
  async (_, hre) => {
    const { run } = hre;
    // Update issuer and marketplace facets.
    // await run("issuer-update-facets");
    // await run("marketplace-update-facets");

    // Iterate over all deployment artifacts for the current network.
    const fastFilenames = fs
      .readdirSync(`deployments/${hre.network.name}`)
      .filter(
        (fn) => fn.startsWith("Fast") && fn.endsWith("_DiamondProxy.json")
      );
    for (const fn of fastFilenames) {
      const symbol = fn.slice(4, -18);
      await run(`fast-update-facets`, { symbol });
    }
  }
);
