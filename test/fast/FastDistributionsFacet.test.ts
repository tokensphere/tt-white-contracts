import * as chai from "chai";
import { solidity } from "ethereum-waffle";
import { smock } from "@defi-wonderland/smock";

chai.use(solidity);
chai.use(smock.matchers);

describe("FastDistributionsFacet", () => {
  before(async () => { });
  beforeEach(async () => { });

  describe("createDistribution", async () => {
    it("requires FAST membership");
    it("checks for the ERC20 allowance to cover the distribution total");
    it("deploys a new distribution with the correct parameters");
    it("keeps track of the newly deployed distribution");
    it("uses the allowance to transfer from the distributor to the newly deployed distribution");
    it("leaves the distribution in the FeeSetup phase when done");
    it("emits a DistributionDeployed event");
  });

  describe("distributionCount", async () => {
    it("returns the number of deployed distributions");
  });

  describe("paginateDistributions", async () => {
    it("returns pages of deployed distributions");
  });
});
