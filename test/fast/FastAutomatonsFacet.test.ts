import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { FastAutomatonsFacet } from "../../typechain";
import { fastFixtureFunc } from "../fixtures/fast";
import {
  Issuer,
  Marketplace,
} from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
chai.use(solidity);
chai.use(smock.matchers);

describe("FastAutomatonsFacet", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    rob: SignerWithAddress,
    john: SignerWithAddress;

  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    automatons: FastAutomatonsFacet,
    issuerAutomatons: FastAutomatonsFacet;

  let privilegesFixture: ReadonlyArray<{
    readonly who: SignerWithAddress;
    readonly privileges: number;
  }>;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  const resetIssuerMock = () => {
    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);
  };

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, alice, bob, rob, john] =
      await ethers.getSigners();
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");
    marketplace.issuerAddress.returns(issuer.address);

    privilegesFixture = [
      { who: bob, privileges: 0b01 },
      { who: alice, privileges: 0b01 },
      { who: rob, privileges: 0b11 },
    ];
  });

  beforeEach(async () => {
    resetIssuerMock();

    // Issuer is a member of the issuer contract.
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);

    marketplace.isMember.reset();

    [governor, alice, bob, rob, john].forEach(({ address }) => {
      marketplace.isMember.whenCalledWith(address).returns(true);
      marketplace.isActiveMember.whenCalledWith(address).returns(true);
    });
    marketplace.isMember.returns(false);
    marketplace.isActiveMember.returns(false);

    await fastDeployFixture({
      opts: {
        name: "FastAutomatonsFixture",
        deployer: deployer.address,
        afterDeploy: async ({ fast }) => {
          automatons = await ethers.getContractAt<FastAutomatonsFacet>(
            "FastAutomatonsFacet",
            fast.address
          );
          issuerAutomatons = await automatons.connect(issuerMember);

          for (const {
            who: { address },
            privileges,
          } of privilegesFixture) {
            await issuerAutomatons.setAutomatonPrivileges(address, privileges);
          }
        },
      },
      initWith: {
        issuer: issuer.address,
        marketplace: marketplace.address,
        governor: governor.address,
      },
    });
  });

  describe("IHasAutomatons", async () => {
    describe("isAutomaton", async () => {
      it("returns true when a privilege exists for the given candidate", async () => {
        for (const {
          who: { address },
        } of privilegesFixture) {
          expect(await automatons.isAutomaton(address)).to.eq(true);
        }
      });

      it("returns false when no privilege exists for the given candidate", async () => {
        expect(await automatons.isAutomaton(john.address)).to.eq(false);
      });
    });

    describe("automatonPrivileges", async () => {
      it("returns a bitfield of the candidate privileges", async () => {
        for (const {
          who: { address },
          privileges,
        } of privilegesFixture) {
          const subject = await automatons.automatonPrivileges(address);
          expect(subject).to.eq(privileges);
        }
      });

      it("returns zero when no privileges exist for the candidate", async () => {
        expect(await automatons.automatonPrivileges(john.address)).to.eq(0b00);
      });
    });

    describe("automatonCount", async () => {
      it("returns the number of registered automatons", async () => {
        const subject = await automatons.automatonCount();
        expect(subject).to.eq(privilegesFixture.length);
      });
    });

    describe("paginateAutomatons", async () => {
      it("paginates registered automatons", async () => {
        const [page, nextCursor] = await automatons.paginateAutomatons(1, 2);
        expect(page).to.eql([alice.address, rob.address]);
        expect(nextCursor).to.eq(3);
      });
    });

    describe("setAutomatonPrivileges", async () => {
      it("requires issuer membership", async () => {
        const subject = automatons.setAutomatonPrivileges(john.address, 0b111);
        await expect(subject).to.be.revertedWith(`RequiresAutomatonsManager`);
      });

      it("assigns the given privileges to the candidate", async () => {
        await issuerAutomatons.setAutomatonPrivileges(john.address, 0b111);
        const subject = await automatons.automatonPrivileges(john.address);
        expect(subject).to.eq(0b111);
      });

      it("overwrites existing privileges", async () => {
        await issuerAutomatons.setAutomatonPrivileges(alice.address, 0b111);
        const subject = await automatons.automatonPrivileges(alice.address);
        expect(subject).to.eq(0b111);
      });

      it("emits a AutomatonPrivilegesSet event", async () => {
        const subject = await issuerAutomatons.setAutomatonPrivileges(
          john.address,
          0b111
        );
        await expect(subject)
          .to.emit(issuerAutomatons, "AutomatonPrivilegesSet")
          .withArgs(john.address, 0b111);
      });
    });

    describe("removeAutomaton", async () => {
      it("requires issuer privileges", async () => {
        const subject = automatons.removeAutomaton(john.address);
        await expect(subject).to.be.revertedWith(`RequiresAutomatonsManager`);
      });

      it("removes the automaton from the list", async () => {
        await issuerAutomatons.removeAutomaton(alice.address);
        const subject = await automatons.isAutomaton(alice.address);
        expect(subject).to.eq(false);
      });

      it("emits a AutomatonRemoved event", async () => {
        const subject = await issuerAutomatons.removeAutomaton(alice.address);
        await expect(subject)
          .to.emit(issuerAutomatons, "AutomatonRemoved")
          .withArgs(alice.address);
      });
    });
  });
});
