import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { deployments, ethers } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { FakeContract, MockContract, smock } from "@defi-wonderland/smock";
import {
  FastTopFacet,
  FastAccessFacet,
  FastTokenFacet,
  FastHistoryFacet,
  FastFrontendFacet,
} from "../../typechain";
import { ZERO_ADDRESS, ZERO_ACCOUNT_MOCK } from "../../src/utils";
import {
  UNDERFLOWED_OR_OVERFLOWED,
  DEFAULT_TRANSFER_REFERENCE,
  impersonateContract,
} from "../utils";
import { fastFixtureFunc, FAST_INIT_DEFAULTS } from "../fixtures/fast";
import {
  Fast,
  Issuer,
  Marketplace,
} from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
chai.use(solidity);
chai.use(smock.matchers);

describe("FastTokenFacet", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    governor: SignerWithAddress,
    mpMember: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    john: SignerWithAddress,
    anonymous: SignerWithAddress;
  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    fast: Fast,
    token: FastTokenFacet,
    tokenMock: MockContract<FastTokenFacet>,
    topMock: MockContract<FastTopFacet>,
    accessMock: MockContract<FastAccessFacet>,
    historyMock: MockContract<FastHistoryFacet>,
    frontendMock: MockContract<FastFrontendFacet>,
    governedToken: FastTokenFacet,
    issuerMemberToken: FastTokenFacet;

  const fastDeployFixture = deployments.createFixture(fastFixtureFunc);

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, governor, mpMember, alice, bob, john, anonymous] =
      await ethers.getSigners();
    // Mock an Issuer and an Marketplace contract.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");

    // Set up issuer members.
    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);

    // Set up marketplace members.
    marketplace.issuerAddress.returns(issuer.address);
  });

  beforeEach(async () => {
    // Set up marketplace members.
    marketplace.isMember.reset();
    for (const { address } of [governor, mpMember, alice, bob, john]) {
      marketplace.isMember.whenCalledWith(address).returns(true);
      marketplace.isActiveMember.whenCalledWith(address).returns(true);
    }
    marketplace.isMember.returns(false);
    marketplace.isActiveMember.returns(true);

    await fastDeployFixture({
      opts: {
        name: "FastTokenFixture",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ fast, accessMock, topMock, tokenMock, historyMock, frontendMock } =
            args);
          await fast.connect(issuerMember).addGovernor(governor.address);
          token = await ethers.getContractAt<FastTokenFacet>(
            "FastTokenFacet",
            fast.address
          );
          governedToken = token.connect(governor);
          issuerMemberToken = token.connect(issuerMember);
        },
      },
      initWith: {
        issuer: issuer.address,
        marketplace: marketplace.address,
      },
    });

    // Add a few FAST members.
    for (const { address } of [alice, bob, john])
      accessMock.isMember.whenCalledWith(address).returns(true);

    topMock.hasFixedSupply.reset();
    topMock.hasFixedSupply.returns(true);
    topMock.isSemiPublic.reset();
    topMock.isSemiPublic.returns(false);
    topMock.transfersDisabled.returns(false);
  });

  /// Public stuff.

  describe("initialize", () => {
    it("keeps track of the ERC20 parameters and extra ones", async () => {
      const name = await token.name();
      expect(name).to.eq(FAST_INIT_DEFAULTS.name);

      const symbol = await token.symbol();
      expect(symbol).to.eq(FAST_INIT_DEFAULTS.symbol);

      const decimals = await token.decimals();
      expect(decimals).to.eq(FAST_INIT_DEFAULTS.decimals);
    });
  });

  /// Public member getters.

  describe("name", () => {
    it("returns the name", async () => {
      const subject = await token.name();
      expect(subject).to.eq(FAST_INIT_DEFAULTS.name);
    });
  });

  describe("symbol", () => {
    it("returns the symbol", async () => {
      const subject = await token.symbol();
      expect(subject).to.eq(FAST_INIT_DEFAULTS.symbol);
    });
  });

  describe("decimals", () => {
    it("returns the decimals", async () => {
      const subject = await token.decimals();
      expect(subject).to.eq(FAST_INIT_DEFAULTS.decimals);
    });
  });

  describe("totalSupply", () => {
    it("returns the total supply", async () => {
      const subject = await token.totalSupply();
      expect(subject).to.eq(0);
    });
  });

  describe("mint", () => {
    it("requires Issuer membership (anonymous)", async () => {
      const subject = token.mint(5_000, "Attempt 1");
      await expect(subject).to.have.revertedWith(`RequiresIssuerMembership`);
    });

    it("requires Issuer membership (member)", async () => {
      const subject = token.connect(alice).mint(5_000, "Attempt 1");
      await expect(subject).to.have.revertedWith(`RequiresIssuerMembership`);
    });

    it("requires Issuer membership (governor)", async () => {
      const subject = governedToken.mint(5_000, "Attempt 1");
      await expect(subject).to.have.revertedWith(`RequiresIssuerMembership`);
    });

    describe("with fixed supply", () => {
      it("is allowed only once", async () => {
        await issuerMemberToken.mint(1_000_000, "Attempt 1");
        const subject = issuerMemberToken.mint(1_000_000, "Attempt 2");
        await expect(subject).to.have.revertedWith("RequiresContinuousSupply");
      });
    });

    describe("with continuous supply", () => {
      beforeEach(async () => {
        topMock.hasFixedSupply.returns(false);
      });

      it("is allowed more than once", async () => {
        const balanceBefore = await token.balanceOf(ZERO_ADDRESS);
        await Promise.all([
          issuerMemberToken.mint(1, "Attempt 1"),
          issuerMemberToken.mint(1, "Attempt 2"),
        ]);
        const balanceAfter = await token.balanceOf(ZERO_ADDRESS);
        expect(balanceBefore).to.eq(balanceAfter.sub(2));
      });
    });

    it("delegates to the history contract", async () => {
      historyMock.minted.reset();
      await issuerMemberToken.mint(5_000, "Attempt 1");
      expect(historyMock.minted)
        .to.have.been.calledOnceWith(5_000, "Attempt 1")
        .delegatedFrom(token.address);
    });

    it("adds the minted tokens to the zero address", async () => {
      await issuerMemberToken.mint(3_000, "Attempt 1");
      const subject = await token.balanceOf(ZERO_ADDRESS);
      expect(subject).to.eq(3_000);
    });

    it("does not impact total supply", async () => {
      await issuerMemberToken.mint(3_000, "Attempt 1");
      const subject = await token.totalSupply();
      expect(subject).to.eq(0);
    });

    it("emits a Minted event", async () => {
      const subject = issuerMemberToken.mint(3_000, "Attempt 1");
      await expect(subject)
        .to.emit(fast, "Minted")
        .withArgs(3_000, "Attempt 1", issuerMember.address);
    });

    it("delegates to the frontend facet");
  });

  describe("burn", () => {
    beforeEach(async () => {
      topMock.hasFixedSupply.returns(false);
      await issuerMemberToken.mint(100, "A hundred mints");
    });

    it("requires Issuer membership (anonymous)", async () => {
      const subject = token.burn(5, "Burn baby burn");
      await expect(subject).to.have.revertedWith(`RequiresIssuerMembership`);
    });

    it("requires Issuer membership (member)", async () => {
      const subject = token.connect(alice).burn(5, "Burn baby burn");
      await expect(subject).to.have.revertedWith(`RequiresIssuerMembership`);
    });

    it("requires Issuer membership (governor)", async () => {
      const subject = governedToken.burn(5, "Burn baby burn");
      await expect(subject).to.have.revertedWith(`RequiresIssuerMembership`);
    });

    it("requires that the supply is continuous", async () => {
      topMock.hasFixedSupply.returns(true);
      const subject = issuerMemberToken.burn(5, "Burn baby burn");
      await expect(subject).to.have.revertedWith("RequiresContinuousSupply");
    });

    it("requires that the zero address has enough funds", async () => {
      const subject = issuerMemberToken.burn(101, "Burn baby burn");
      await expect(subject).to.have.revertedWith(UNDERFLOWED_OR_OVERFLOWED);
    });

    it("removes tokens from the zero address", async () => {
      const subject = async () => issuerMemberToken.burn(30, "Burn baby burn");
      await expect(subject).to.changeTokenBalance(
        token,
        ZERO_ACCOUNT_MOCK,
        -30
      );
    });

    it("does not impact total supply", async () => {
      const totalSupplyBefore = await token.totalSupply();
      await issuerMemberToken.burn(100, "Burnidy burn");
      const subject = await token.totalSupply();
      expect(subject).to.eq(totalSupplyBefore);
    });

    it("delegates to the history contract", async () => {
      historyMock.burnt.reset();
      await issuerMemberToken.burn(50, "It is hot");
      expect(historyMock.burnt)
        .to.have.been.calledOnceWith(50, "It is hot")
        .delegatedFrom(token.address);
    });

    it("emits a Burnt event", async () => {
      const subject = issuerMemberToken.burn(50, "Feel the burn");
      await expect(subject)
        .to.emit(fast, "Burnt")
        .withArgs(50, "Feel the burn", issuerMember.address);
    });

    it("delegates to the frontend facet");
  });

  describe("retrieveDeadTokens", () => {
    beforeEach(async () => {
      // Mint a few tokens and raise the transfer credits.
      await issuerMemberToken.mint(1_000_000, "ERC20 Tests");
      // Transfer tokens from address zero to alice and bob.
      await Promise.all(
        [alice, bob].map(({ address }) =>
          issuerMemberToken.transferFrom(ZERO_ADDRESS, address, 100)
        )
      );
    });

    it("requires Issuer membership", async () => {
      const subject = token.retrieveDeadTokens(bob.address);
      await expect(subject).to.have.revertedWith(`RequiresIssuerMembership`);
    });

    it("emits a Transfer and a FastTransfer event", async () => {
      const subject = issuerMemberToken.retrieveDeadTokens(alice.address);

      await expect(subject)
        .to.emit(fast, "FastTransfer")
        .withArgs(
          issuerMember.address,
          alice.address,
          ZERO_ADDRESS,
          100,
          "Dead tokens retrieval"
        );
      await expect(subject)
        .to.emit(fast, "Transfer")
        .withArgs(alice.address, ZERO_ADDRESS, 100);
    });

    it("emits a Transfer event if the balance was already zero", async () => {
      const subject = issuerMemberToken.retrieveDeadTokens(john.address);
      await expect(subject)
        .to.emit(fast, "Transfer")
        .withArgs(john.address, ZERO_ADDRESS, 0);
    });

    it("sets the holder balance to zero while increasing the reserve balance", async () => {
      const subject = async () =>
        issuerMemberToken.retrieveDeadTokens(alice.address);
      await expect(subject).to.changeTokenBalances(
        token,
        [alice, ZERO_ACCOUNT_MOCK],
        [-100, 100]
      );
    });

    it("decreases the total supply by the amount", async () => {
      const totalSupplyBefore = await token.totalSupply();
      await issuerMemberToken.retrieveDeadTokens(alice.address);
      const totalSupplyAfter = await token.totalSupply();
      expect(totalSupplyBefore.sub(totalSupplyAfter)).to.eq(100);
    });

    it("removes the holder from the FAST token holder list", async () => {
      await issuerMemberToken.retrieveDeadTokens(alice.address);
      const subject = await token.holders();
      expect(subject).to.be.eql([bob.address]);
    });

    it("calls the marketplace to stop tracking this token holder for this FAST", async () => {
      marketplace.fastBalanceChanged.reset();
      await issuerMemberToken.retrieveDeadTokens(alice.address);
      expect(marketplace.fastBalanceChanged).to.have.been.calledOnceWith(
        alice.address,
        0
      );
    });

    it("emits a FastTransfer and Transfer events between the holder and the reserve", async () => {
      const subject = issuerMemberToken.retrieveDeadTokens(alice.address);
      await expect(subject)
        .to.emit(fast, "FastTransfer")
        .withArgs(
          issuerMember.address,
          alice.address,
          ZERO_ADDRESS,
          100,
          "Dead tokens retrieval"
        );
      await expect(subject)
        .to.emit(fast, "Transfer")
        .withArgs(alice.address, ZERO_ADDRESS, 100);
    });

    it("delegates to the Frontend facet for a global event emission", async () => {
      frontendMock.emitDetailsChanged.reset();
      await issuerMemberToken.retrieveDeadTokens(alice.address);
      expect(frontendMock.emitDetailsChanged)
        .to.have.been.calledOnceWith()
        .delegatedFrom(token.address);
    });

    it("delegates to the History facet for papertrail tracking", async () => {
      historyMock.transfered.reset();
      await issuerMemberToken.retrieveDeadTokens(alice.address);
      expect(historyMock.transfered)
        .to.have.been.calledOnceWith(
          issuerMember.address,
          alice.address,
          ZERO_ADDRESS,
          100,
          "Dead tokens retrieval"
        )
        .delegatedFrom(token.address);
    });
  });

  /// ERC20 implementation.

  describe("ERC20", () => {
    beforeEach(async () => {
      // Mint a few tokens and raise the transfer credits.
      await issuerMemberToken.mint(1_000_000, "ERC20 Tests");
      // Transfer tokens from address zero to alice and bob.
      await Promise.all(
        [alice, bob].map(async ({ address }) =>
          issuerMemberToken.transferFrom(ZERO_ADDRESS, address, 100)
        )
      );
    });

    describe("balanceOf", () => {
      it("returns the amount of tokens at a given address", async () => {
        const subject = await token.balanceOf(alice.address);
        expect(subject).to.eq(100);
      });
    });

    describe("transfer", () => {
      it("delegates to the internal performTransfer method", async () => {
        tokenMock.performTransfer.reset();

        // Expected passed arguments.
        const args = {
          spender: alice.address,
          from: alice.address,
          to: bob.address,
          amount: BigNumber.from(1),
          ref: DEFAULT_TRANSFER_REFERENCE,
        };
        await token.connect(alice).transfer(args.to, args.amount);
        // Expect performTransfer to be called correctly.
        expect(tokenMock.performTransfer)
          .to.have.been.calledOnceWith(args)
          .delegatedFrom(token.address);
      });
    });

    describe("transferWithRef", () => {
      it("delegates to the internal performTransfer method", async () => {
        tokenMock.performTransfer.reset();

        const args = {
          spender: alice.address,
          from: alice.address,
          to: bob.address,
          amount: BigNumber.from(1),
          ref: "Some ref message",
        };
        await token
          .connect(alice)
          .transferWithRef(args.to, args.amount, args.ref);
        // Expect performTransfer to be called correctly.
        expect(tokenMock.performTransfer)
          .to.have.been.calledOnceWith(args)
          .delegatedFrom(token.address);
      });
    });

    describe("allowance", () => {
      it("returns the allowance for a given member", async () => {
        // Let bob give allowance to alice.
        await token.connect(bob).approve(alice.address, 50);
        // Do it!
        const subject = await token.allowance(bob.address, alice.address);
        expect(subject).to.eq(50);
      });

      it("follows value at zero address for issuer members", async () => {
        let subject: BigNumber;
        // Make the token continuous supply.
        topMock.hasFixedSupply.returns(false);
        // Check the balance.
        const allocated = await token.balanceOf(ZERO_ADDRESS);
        subject = await token.allowance(ZERO_ADDRESS, issuerMember.address);
        expect(subject).to.eq(allocated);

        // Mint some more.
        issuerMemberToken.mint(50, "Adding some more");
        subject = await token.allowance(ZERO_ADDRESS, issuerMember.address);
        expect(subject).to.eq(allocated.add(50));
      });
    });

    describe("approve", () => {
      it("delegates to the internal performApproval method", async () => {
        tokenMock.performApproval.reset();

        const args = {
          spender: alice.address,
          from: john.address,
          amount: BigNumber.from(1),
        };

        // Let alice give allowance to john.
        await token.connect(alice).approve(args.from, args.amount);

        // Expect performApproval to be called correctly.
        expect(tokenMock.performApproval)
          .to.have.been.calledOnceWith(args.spender, args.from, args.amount)
          .delegatedFrom(token.address);
      });

      it("requires FAST membership", async () => {
        // Remove alice as a member.
        accessMock.isMember.reset();
        accessMock.isMember.whenCalledWith(alice.address).returns(false);

        // Let alice give allowance to john.
        const subject = token.connect(alice).approve(john.address, 1);

        await expect(subject).to.have.revertedWith(`RequiresValidTokenHolder`);
      });

      it("adds an allowance with the correct parameters", async () => {
        // Let alice give allowance to bob.
        await token.connect(alice).approve(bob.address, 50);
        // Do it!
        const subject = await token.allowance(alice.address, bob.address);
        expect(subject).to.eq(50);
      });

      it("functions properly when given a zero amount", async () => {
        await Promise.all([
          token.connect(alice).approve(bob.address, 0),
          token.connect(alice).approve(bob.address, 10),
          token.connect(alice).approve(bob.address, 0),
        ]);
        const subject = await token.allowance(alice.address, bob.address);
        expect(subject).to.eq(10);
      });

      it("stacks up new allowances", async () => {
        // Let alice give allowance to bob, twice.
        await token.connect(alice).approve(bob.address, 10);
        await token.connect(alice).approve(bob.address, 20);
        const subject = await token.allowance(alice.address, bob.address);
        expect(subject).to.eq(30);
      });

      it("keeps track of given allowances", async () => {
        await token.connect(alice).approve(bob.address, 10);
        const [[a1]] = await token.paginateAllowancesByOwner(
          alice.address,
          0,
          5
        );
        expect(a1).to.eq(bob.address);
      });

      it("keeps track of received allowances", async () => {
        await token.connect(alice).approve(bob.address, 10);
        const [[a1]] = await token.paginateAllowancesBySpender(
          bob.address,
          0,
          5
        );
        expect(a1).to.eq(alice.address);
      });

      it("emits an Approval event", async () => {
        // Let alice give allowance to bob.
        const subject = token.connect(alice).approve(bob.address, 60);
        await expect(subject)
          .to.emit(fast, "Approval")
          .withArgs(alice.address, bob.address, 60);
      });
    });

    describe("disapprove", () => {
      beforeEach(async () => {
        // Let bob give john an allowance.
        await token.connect(bob).approve(john.address, 15);
      });

      it("delegates to the internal Disapproval method", async () => {
        tokenMock.performDisapproval.reset();

        const args = {
          spender: bob.address,
          from: john.address,
        };

        // Remove Johns approval.
        await token.connect(bob).disapprove(args.from, 10);

        // Expect performDisapproval to be called correctly.
        expect(tokenMock.performDisapproval)
          .to.have.been.calledOnceWith(args.spender, args.from, 10)
          .delegatedFrom(token.address);
      });

      it("subtracts from the existing allowance", async () => {
        await token.connect(bob).disapprove(john.address, 10);
        const subject = await token.allowance(bob.address, john.address);
        expect(subject).to.eq(5);
      });

      describe("when the allowance remains positive after the operation", () => {
        beforeEach(async () => {
          // Remove full allowance.
          await token.connect(bob).disapprove(john.address, 10);
        });

        it("removes the spender received allowance when it reaches zero", async () => {
          const [allowances] = await token.paginateAllowancesBySpender(
            john.address,
            0,
            5
          );
          expect(allowances).to.not.be.empty;
        });

        it("removes the original given allowance when it reaches zero", async () => {
          const [allowances] = await token.paginateAllowancesByOwner(
            bob.address,
            0,
            5
          );
          expect(allowances).to.not.be.empty;
        });
      });

      describe("when the allowance reaches zero", () => {
        beforeEach(async () => {
          // Remove full allowance.
          await token.connect(bob).disapprove(john.address, 15);
        });

        it("removes the spender received allowance when it reaches zero", async () => {
          const [allowances] = await token.paginateAllowancesBySpender(
            john.address,
            0,
            5
          );
          expect(allowances).to.be.empty;
        });

        it("removes the original given allowance when it reaches zero", async () => {
          const [allowances] = await token.paginateAllowancesByOwner(
            bob.address,
            0,
            5
          );
          expect(allowances).to.be.empty;
        });
      });

      it("emits a Disapproval event", async () => {
        const subject = token.connect(bob).disapprove(john.address, 10);
        await expect(subject)
          .to.emit(fast, "Disapproval")
          .withArgs(bob.address, john.address, 10);
      });
    });

    describe("transferFrom", () => {
      it("delegates to the internal performTransfer method", async () => {
        tokenMock.performTransfer.reset();

        const args = {
          spender: alice.address,
          from: alice.address,
          to: bob.address,
          amount: BigNumber.from(1),
          ref: DEFAULT_TRANSFER_REFERENCE,
        };
        await token
          .connect(alice)
          .transferFrom(args.from, args.to, args.amount);
        // Expect performTransfer to be called correctly.
        expect(tokenMock.performTransfer)
          .to.have.been.calledOnceWith(args)
          .delegatedFrom(token.address);
      });
    });

    describe("transferFromWithRef", () => {
      beforeEach(async () => {
        // Let bob give allowance to john.
        await token.connect(bob).approve(john.address, 100);
      });

      it("delegates to the internal performTransfer method", async () => {
        tokenMock.performTransfer.reset();

        const args = {
          spender: alice.address,
          from: alice.address,
          to: bob.address,
          amount: BigNumber.from(1),
          ref: "Some useful ref",
        };
        await token
          .connect(alice)
          .transferFromWithRef(args.from, args.to, args.amount, args.ref);
        // Expect performTransfer to be called correctly.
        expect(tokenMock.performTransfer)
          .to.have.been.calledOnceWith(args)
          .delegatedFrom(token.address);
      });

      describe("for a zero amount", () => {
        let tx: any;
        let allowance: BigNumber;
        let args: {
          spender: string;
          from: string;
          to: string;
          amount: BigNumber;
          ref: string;
        };

        beforeEach(async () => {
          historyMock.transfered.reset();
          tokenMock.performTransfer.reset();

          args = {
            spender: bob.address,
            from: alice.address,
            to: bob.address,
            amount: BigNumber.from(0),
            ref: "Some useful ref",
          };

          allowance = BigNumber.from(10);
          await token.connect(alice).approve(args.spender, allowance);

          tx = await token
            .connect(alice)
            .transferFromWithRef(args.from, args.to, args.amount, args.ref);
        });

        it("does not impact balances", async () => {
          expect(tx).to.changeEtherBalances([alice, bob], [0, 0]);
        });

        it("does not impact allowances", async () => {
          const subject = await token.allowance(alice.address, bob.address);
          expect(subject).to.be.eql(allowance);
        });

        it("does not delegate to MarketplaceTokenHoldersFacet.fastBalanceChanged", async () => {
          expect(marketplace.fastBalanceChanged).to.not.have.been.calledOnce;
        });

        it("delegates to FastHistoryFacet.transfered", async () => {
          expect(historyMock.transfered).to.have.been.calledOnceWith(
            alice.address,
            alice.address,
            bob.address,
            args.amount,
            args.ref
          );
        });

        it("emits a Transfer event", async () => {
          expect(tx)
            .to.emit(fast, "Transfer")
            .withArgs(args.from, args.to, args.amount);
        });
      });

      describe("when member deactivated", () => {
        beforeEach(async () => {
          marketplace.isMember.reset();
          marketplace.isActiveMember.reset();
          // Both Bob and Alice are marketplace members.
          marketplace.isMember.whenCalledWith(bob.address).returns(true);
          marketplace.isMember.whenCalledWith(alice.address).returns(true);
          marketplace.isMember.returns(false);
          // Only Bob is active in the marketplace.
          marketplace.isActiveMember.whenCalledWith(bob.address).returns(true);
          marketplace.isActiveMember
            .whenCalledWith(alice.address)
            .returns(false);
          marketplace.isActiveMember.returns(false);
        });

        it("requires active member when transferring from address (at the Marketplace level)", async () => {
          const subject = token
            .connect(alice)
            .transferFromWithRef(alice.address, bob.address, 100, "ref");
          await expect(subject).to.have.revertedWith(
            `RequiresMarketplaceActiveMembership`
          );
        });

        it("allows transfer to a deactived member (at the Marketplace level)", async () => {
          const subject = () =>
            token
              .connect(bob)
              .transferFromWithRef(bob.address, alice.address, 100, "One");
          await expect(subject).to.changeTokenBalances(
            token,
            [bob, alice],
            [-100, 100]
          );
        });
      });

      describe("when semi-public", () => {
        beforeEach(async () => {
          topMock.isSemiPublic.returns(true);
        });

        it("requires sender membership (Marketplace membership)", async () => {
          marketplace.isMember.reset();
          // Only Bob will be an marketplace member.
          marketplace.isMember.whenCalledWith(bob.address).returns(true);
          marketplace.isMember.returns(false);

          const subject = token
            .connect(alice)
            .transferFromWithRef(john.address, bob.address, 100, "One");
          await expect(subject).to.have.revertedWith(
            `RequiresValidTokenHolder`
          );
        });

        it("requires recipient membership (Marketplace membership)", async () => {
          marketplace.isMember.reset();
          // Only Bob will be an marketplace member.
          marketplace.isMember.whenCalledWith(bob.address).returns(true);
          marketplace.isMember.returns(false);

          const subject = token
            .connect(alice)
            .transferFromWithRef(bob.address, john.address, 100, "One");
          await expect(subject).to.have.revertedWith(
            `RequiresValidTokenHolder`
          );
        });

        it("allows marketplace members to transact", async () => {
          marketplace.isMember.reset();
          // Bob and John will be marketplace members.
          marketplace.isMember.whenCalledWith(bob.address).returns(true);
          marketplace.isMember.whenCalledWith(john.address).returns(true);
          marketplace.isMember.returns(false);

          // Let bob give allowance to alice.
          await token.connect(bob).approve(alice.address, 100);

          const subject = () =>
            token
              .connect(alice)
              .transferFromWithRef(bob.address, john.address, 100, "One");
          await expect(subject).to.changeTokenBalances(
            token,
            [bob, john],
            [-100, 100]
          );
        });
      });

      describe("when private", () => {
        beforeEach(async () => {
          // Explicitly set the token as private.
          topMock.isSemiPublic.reset();
          topMock.isSemiPublic.returns(false);
        });

        it("requires sender membership (FAST member)", async () => {
          const subject = token
            .connect(john)
            .transferFromWithRef(anonymous.address, bob.address, 100, "One");
          await expect(subject).to.have.revertedWith(
            `RequiresValidTokenHolder`
          );
        });

        it("requires recipient membership (FAST member)", async () => {
          const subject = token
            .connect(john)
            .transferFromWithRef(bob.address, anonymous.address, 100, "One");
          await expect(subject).to.have.revertedWith(
            `RequiresValidTokenHolder`
          );
        });
      });

      it("requires that the sender and recipient are different", async () => {
        const subject = token
          .connect(john)
          .transferFromWithRef(bob.address, bob.address, 100, "No!");
        await expect(subject).to.have.revertedWith(
          `RequiresDifferentSenderAndRecipient`
        );
      });

      it("requires sufficient funds", async () => {
        const subject = token
          .connect(john)
          .transferFromWithRef(bob.address, alice.address, 101, "Two");
        await expect(subject).to.have.revertedWith(UNDERFLOWED_OR_OVERFLOWED);
      });

      it("requires that transfers are enabled", async () => {
        topMock.transfersDisabled.returns(true);
        const subject = token
          .connect(john)
          .transferFromWithRef(bob.address, alice.address, 100, "Four");
        await expect(subject).to.have.revertedWith("RequiresTransfersEnabled");
      });

      it("transfers from / to the given wallet address", async () => {
        const subject = () =>
          token
            .connect(john)
            .transferFromWithRef(bob.address, alice.address, 100, "Four");
        await expect(subject).to.changeTokenBalances(
          token,
          [bob, alice],
          [-100, 100]
        );
      });

      it("delegates to the history contract", async () => {
        historyMock.transfered.reset();
        await token
          .connect(john)
          .transferFromWithRef(bob.address, alice.address, 12, "Five");
        expect(historyMock.transfered)
          .to.have.been.calledOnceWith(
            john.address,
            bob.address,
            alice.address,
            12,
            "Five"
          )
          .delegatedFrom(token.address);
      });

      it("delegates to the MarketplaceTokenHoldersFacet contract", async () => {
        marketplace.fastBalanceChanged.reset();
        await token
          .connect(john)
          .transferFromWithRef(bob.address, alice.address, 12, "Five");
        expect(marketplace.fastBalanceChanged).to.have.been.calledTwice;
      });

      it("updates who holds this token", async () => {
        await token
          .connect(john)
          .transferFromWithRef(bob.address, alice.address, 12, "Five");

        const subject = await token.holders();
        expect(subject).to.be.eql([alice.address, bob.address]);
      });

      it("decreases total supply when transferring to the zero address", async () => {
        // Keep total supply.
        const supplyBefore = await token.totalSupply();
        // Do it!
        await token
          .connect(john)
          .transferFromWithRef(
            bob.address,
            ZERO_ADDRESS,
            100,
            "Five and a half?"
          );
        // Check that total supply decreased.
        expect(await token.totalSupply()).to.eql(supplyBefore.add(-100));
      });

      it("emits a IERC20.Transfer event", async () => {
        const subject = token
          .connect(john)
          .transferFromWithRef(bob.address, alice.address, 98, "Six");
        await expect(subject)
          .to.emit(fast, "Transfer")
          .withArgs(bob.address, alice.address, 98);
      });

      // `transferFrom` specific!

      it("requires that there is enough allowance", async () => {
        const subject = token
          .connect(bob)
          .transferFromWithRef(alice.address, john.address, 100, "Seven");
        await expect(subject).to.have.revertedWith(UNDERFLOWED_OR_OVERFLOWED);
      });

      it("allows non-members to transact on behalf of members", async () => {
        // Let bob give allowance to anonymous.
        await token.connect(bob).approve(anonymous.address, 150);
        // Do it!
        const subject = () =>
          token
            .connect(anonymous)
            .transferFromWithRef(bob.address, alice.address, 100, "Eight");
        await expect(subject).to.changeTokenBalances(
          token,
          [bob, alice],
          [-100, 100]
        );
      });

      it("increases total supply when transferring from the zero address", async () => {
        // Keep track of total supply.
        const supplyBefore = await token.totalSupply();
        // Do it!
        await issuerMemberToken.transferFromWithRef(
          ZERO_ADDRESS,
          alice.address,
          100,
          "Eight and a half?"
        );
        // Check that total supply increased.
        expect(await token.totalSupply()).to.eql(supplyBefore.add(100));
      });

      it("requires that zero address can only be spent from as an issuer member (governor)", async () => {
        const subject = governedToken.transferFromWithRef(
          ZERO_ADDRESS,
          alice.address,
          100,
          "Nine"
        );
        await expect(subject).to.have.revertedWith(`RequiresIssuerMembership`);
      });

      it("requires that zero address can only be spent from as an issuer member (member)", async () => {
        const subject = token
          .connect(bob)
          .transferFromWithRef(ZERO_ADDRESS, alice.address, 100, "Cat");
        await expect(subject).to.have.revertedWith(`RequiresIssuerMembership`);
      });

      it("requires that zero address can only be spent from as an issuer member (anonymous)", async () => {
        const subject = token.transferFromWithRef(
          ZERO_ADDRESS,
          alice.address,
          100,
          "Dog"
        );
        await expect(subject).to.have.revertedWith(`RequiresIssuerMembership`);
      });

      it("allows issuer members to transfer from the zero address", async () => {
        const subject = () =>
          issuerMemberToken.transferFromWithRef(
            ZERO_ADDRESS,
            alice.address,
            100,
            "Spider"
          );
        await expect(subject).to.changeTokenBalances(
          token,
          [ZERO_ACCOUNT_MOCK, alice],
          [-100, 100]
        );
      });
    });
  });

  /// Allowance querying.

  describe("givenAllowanceCount", () => {
    beforeEach(async () => {
      // Let alice give allowance to bob and john.
      await token.connect(alice).approve(bob.address, 5);
      await token.connect(alice).approve(john.address, 10);
    });

    it("returns the count of allowancesByOwner", async () => {
      const count = await token.givenAllowanceCount(alice.address);
      expect(count).to.eq(2);
    });
  });

  describe("paginateAllowancesByOwner", () => {
    beforeEach(async () => {
      // Let alice give allowance to bob and john, let bob give allowance to john.
      await token.connect(alice).approve(bob.address, 5);
      await token.connect(alice).approve(john.address, 10);
      await token.connect(bob).approve(john.address, 15);
    });

    it("returns the list of addresses to which the caller gave allowances to", async () => {
      const [[a1, a2]] = await token.paginateAllowancesByOwner(
        alice.address,
        0,
        5
      );
      expect(a1).to.eq(bob.address);
      expect(a2).to.eq(john.address);
    });

    it("does not list addresses from which the caller has received allowances", async () => {
      const [allowances] = await token.paginateAllowancesByOwner(
        john.address,
        0,
        5
      );
      expect(allowances).to.be.empty;
    });
  });

  describe("receivedAllowanceCount", () => {
    beforeEach(async () => {
      // Approve a transaction for Bob.
      await token.connect(alice).approve(bob.address, 5);
    });

    it("returns the count of allowancesBySpender", async () => {
      const count = await token.receivedAllowanceCount(bob.address);
      expect(count).to.eq(1);
    });
  });

  describe("paginateAllowancesBySpender", () => {
    beforeEach(async () => {
      // Let alice give allowance to bob and john, let bob give allowance to john.
      await token.connect(alice).approve(bob.address, 5);
      await token.connect(alice).approve(john.address, 10);
      await token.connect(bob).approve(john.address, 15);
    });

    it("returns the list of addresses to which the caller gave allowances to", async () => {
      const [[a1, a2]] = await token.paginateAllowancesBySpender(
        john.address,
        0,
        5
      );
      expect(a1).to.eq(alice.address);
      expect(a2).to.eq(bob.address);
    });

    it("does not list addresses to which the caller has given allowances", async () => {
      const [allowances] = await token.paginateAllowancesBySpender(
        alice.address,
        0,
        5
      );
      expect(allowances).to.be.empty;
    });
  });

  describe("beforeRemovingMember", () => {
    beforeEach(async () => {
      await issuerMemberToken.mint(1_000, "Give me the money");
    });

    it("cannot be called directly", async () => {
      const subject = token.beforeRemovingMember(alice.address);
      await expect(subject).to.have.revertedWith("InternalMethod");
    });

    describe("when successful", () => {
      let tokenAsItself: FastTokenFacet;
      beforeEach(async () => {
        // Let alice give allowance to bob, and john give allowance to alice.
        await Promise.all([
          token.connect(alice).approve(bob.address, 100),
          token.connect(john).approve(alice.address, 500),
        ]);

        // Impersonate the diamond.
        tokenAsItself = await impersonateContract(token);
      });

      afterEach(async () => {
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [
          token.address,
        ]);
      });

      it("reverts if the member to remove still has a positive balance", async () => {
        // Give alice some tokens.
        await issuerMemberToken.transferFrom(ZERO_ADDRESS, alice.address, 100);
        // Attempt to run the callback, removing alice.
        const subject = tokenAsItself.beforeRemovingMember(alice.address);
        await expect(subject).to.have.revertedWith(`RequiresPositiveBalance`);
      });

      it("sets allowances to / from the removed members to zero", async () => {
        await tokenAsItself.beforeRemovingMember(alice.address);
        expect(await token.allowance(alice.address, bob.address)).to.eq(0);
        expect(await token.allowance(john.address, alice.address)).to.eq(0);
      });

      it("removes given and received allowances", async () => {
        await tokenAsItself.beforeRemovingMember(alice.address);
        // Check that allowances received by the members are gone.
        const [ra] = await token.paginateAllowancesBySpender(bob.address, 0, 5);
        expect(ra).to.be.empty;
        // Check that allowances given by the member are gone.
        const [ga] = await token.paginateAllowancesByOwner(alice.address, 0, 5);
        expect(ga).to.be.empty;
      });

      it("emits a Disapproval event as many times as it removed allowance", async () => {
        const subject = tokenAsItself.beforeRemovingMember(alice.address);
        await expect(subject)
          .to.emit(fast, "Disapproval")
          .withArgs(alice.address, bob.address, 100);
        await expect(subject)
          .to.emit(fast, "Disapproval")
          .withArgs(john.address, alice.address, 500);
      });
    });
  });
});
