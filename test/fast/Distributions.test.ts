import * as chai from "chai";
import { solidity } from "ethereum-waffle";
import { smock } from "@defi-wonderland/smock";

chai.use(solidity);
chai.use(smock.matchers);

describe("Distributions", () => {
  before(async () => { });
  beforeEach(async () => { });

  describe("constructor", async () => {
    it("ensures that the latched block is not in the future");
    it("stores its initial parameters");
    it("initializes the `available` funds using the initial `total`");
    it("also stores the creation block");
    it("delegates a call to balanceOf to the ERC20 token with the correct parameters");
    it("makes sure that the available balance is exactly equal to the total");
    it("advances to the FeeSetup phase");
  });

  describe("advance", async () => {
    describe("when transitioning from BeneficiariesSetup to Withdrawal", async () => {
      it("requires that the caller is a distribution manager");
      it("makes sure that all available funds have been attributed");
      it("transfers the fee to the Issuer contract");
      it("advances to the Withdrawal phase");
    })

    describe("otherwise", async () => {
      it("reverts for any other transition");
    });
  });

  describe("setFee", async () => {
    it("requires that the phase is FeeSetup");
    it("requires that the caller is a distribution manager");
    it("keeps track of the fee");
    it("subtracts the fee from the available funds");
    it("advances to the BeneficiariesSetup phase");
  });

  describe("addBeneficiaries", async () => {
    it("requires that the phase is BeneficiariesSetup");
    it("requires that the caller is a distribution manager");
    it("enforces that the list of beneficiaries matches the list of amounts");
    it("ensures that the needed amount doesn't get past the available funds");
    it("adds the beneficiaries to the internal list along with their correct owings");
    it("emits as many BeneficiaryAdded events as there are beneficiaries added");
    it("updates the available funds after adding all the beneficiaries");
    it("can be called several times with different beneficiaries");
    it("reverts if a beneficiary is added twice");
  });

  describe("removeBeneficiaries", async () => {
    it("requires that the phase is BeneficiariesSetup");
    it("requires that the caller is a distribution manager");
    it("removes given beneficiaries and their owings");
    it("reclaims the unused funds as part of the available funds tracker");
    it("reverts if a beneficiary cannot be removed because it is not present");
    it("emits as many BeneficiaryRemoved events as there are beneficiaries removed");
  });

  describe("paginateBeneficiaries", async () => {
    it("returns pages of beneficiaries");
  });

  describe("withdraw", async () => {
    it("requires that the caller is a known beneficiary");
    it("reverts if the withdrawal already has been made");
    it("can be called on behalf of someone by anyone else");
    it("transfers the ERC20 token to the given beneficiary");
    it("emits a Withdrawal event");
  });

  describe("terminate", async () => {
    it("requires the caller to be a distribution manager");
    it("advances to the Terminated phase");
    it("transfers all unclaimed ERC20 funds back to the distributor");
    it("sets the available funds to zero");
  });

  describe("various synthesized getters", async () => {
    it("exposes VERSION");
    it("exposes initial params");
    it("exposes phase");
    it("exposes creationBlock");
    it("exposes fee");
    it("exposes available");
  });
});
