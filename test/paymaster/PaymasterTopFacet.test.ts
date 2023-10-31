import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { abiStructToObj, impersonateContract } from "../utils";
import { paymasterFixtureFunc } from "../fixtures/paymaster";
import {
  Issuer,
  Marketplace,
  Paymaster,
} from "../../typechain/hardhat-diamond-abi/HardhatDiamondABI.sol";
import {
  IForwarder,
  IRelayHub,
  PaymasterTopFacet
} from "../../typechain";
import { GsnTypes } from "@opengsn/contracts/dist/types/ethers-contracts/ArbRelayHub";
chai.use(solidity);
chai.use(smock.matchers);

describe("PaymasterTopFacet", () => {
  let deployer: SignerWithAddress,
    issuerMember: SignerWithAddress,
    alice: SignerWithAddress;
  let issuer: FakeContract<Issuer>,
    marketplace: FakeContract<Marketplace>,
    forwarder: FakeContract<IForwarder>,
    relayHub: FakeContract<IRelayHub>,
    paymaster: Paymaster,
    issuerPaymaster: PaymasterTopFacet,
    alicePaymaster: PaymasterTopFacet,
    paymasterAsRelayHub: PaymasterTopFacet;

  const paymasterDeployFixture = deployments.createFixture(
    paymasterFixtureFunc
  );

  before(async () => {
    // Keep track of a few signers.
    [deployer, issuerMember, alice] = await ethers.getSigners();
    // Mock contracts.
    issuer = await smock.fake("Issuer");
    marketplace = await smock.fake("Marketplace");

    forwarder = await smock.fake("IForwarder");
    relayHub = await smock.fake("IRelayHub");
  });

  beforeEach(async () => {
    await paymasterDeployFixture({
      opts: {
        name: "PaymasterTopFixture",
        deployer: deployer.address,
        afterDeploy: async (args) => {
          ({ paymaster } = args);

          alicePaymaster = await paymaster.connect(alice);
          issuerPaymaster = await paymaster.connect(issuerMember);

          paymasterAsRelayHub = await impersonateContract(paymaster, relayHub.address);
        },
      },
      initWith: {
        marketplace: marketplace.address,
        issuer: issuer.address,
      },
    });

    issuer.isMember.reset();
    issuer.isMember.whenCalledWith(issuerMember.address).returns(true);
    issuer.isMember.returns(false);

    // IERC165.

    forwarder.supportsInterface.reset();
    // IForwarder interface.
    forwarder.supportsInterface
      .whenCalledWith("0x25e23e64")
      .returns(true);
    forwarder.supportsInterface.returns(false);

    relayHub.supportsInterface.reset();
    // IRelayHub interface.
    relayHub.supportsInterface
      .whenCalledWith("0xe9fb30f7")
      .returns(true);
    relayHub.supportsInterface.returns(false);
  });

  // IERC165.

  describe("IERC165", () => {
    describe("supportsInterface", () => {
      it("returns true for supported interfaces", async () => {
        const subject = await paymaster.supportsInterface("0xe1ab2dea");
        expect(subject).to.be.true;
      });

      it("returns false for un-supported interfaces", async () => {
        const subject = await paymaster.supportsInterface("0xffffffff");
        expect(subject).to.be.false;
      });
    });
  });

  // IPaymaster.

  describe("IPaymaster", () => {

    describe("getRelayHub", () => {
      it("returns the relay hub address", async () => {
        // Set the relay hub address.
        await issuerPaymaster.setRelayHub(relayHub.address);

        const subject = await paymaster.getRelayHub();
        expect(subject).to.eq(relayHub.address);
      });
    });

    describe("getTrustedForwarder", () => {
      it("returns the trusted forwarder address", async () => {
        // Set the trusted forwarder.
        await issuerPaymaster.setTrustedForwarder(forwarder.address);

        const subject = await paymaster.getTrustedForwarder();
        expect(subject).to.eq(forwarder.address);
      });
    });

    describe("getGasAndDataLimits", () => {
      // SEE: https://github.com/opengsn/gsn/blob/master/packages/contracts/src/BasePaymaster.sol
      it("returns the gas and data limits", async () => {
        const subject = abiStructToObj(await paymaster.getGasAndDataLimits());

        expect(subject).to.eql({
          acceptanceBudget: BigNumber.from(100000 + 50000),
          preRelayedCallGasLimit: BigNumber.from(100000),
          postRelayedCallGasLimit: BigNumber.from(110000),
          calldataSizeLimit: BigNumber.from(10500),
        });
      });
    });

    describe("preRelayedCall", () => {
      let stubbedRequest = <IForwarder.ForwardRequestStruct>{};
      let stubbedRelayData = <GsnTypes.RelayDataStruct>{};

      const signature = "0x";
      const approvalData = "0x";
      const maxPossibleGas = 0;

      const setupTrustedForwarder = async () => {
        marketplace.isTrustedForwarder.reset();
        marketplace.isTrustedForwarder.returns(true);
        await issuerPaymaster.setTrustedForwarder(forwarder.address);
      };

      beforeEach(async () => {
        stubbedRequest = {
          from: issuerMember.address,
          to: marketplace.address,
          value: 0,
          gas: 15000,
          nonce: 0,
          data: "0x",
          validUntilTime: 0,
        };

        stubbedRelayData = {
          maxFeePerGas: 0,
          maxPriorityFeePerGas: 0,
          transactionCalldataGasUsed: 0,
          relayWorker: alice.address,
          paymaster: paymaster.address,
          forwarder: forwarder.address,
          paymasterData: "0x",
          clientId: 0,
        };
      });

      // SEE: https://github.com/opengsn/gsn/blob/master/packages/contracts/src/BasePaymaster.sol

      it("reverts if not called by the relay hub", async () => {
        const subject = paymaster.preRelayedCall({
          request: stubbedRequest,
          relayData: stubbedRelayData,
        }, signature, approvalData, maxPossibleGas);

        expect(subject).to.be.revertedWith("RequiresRelayHubCaller");
      });

      describe("when called by the relay hub", () => {

        beforeEach(async () => {
          await issuerPaymaster.setRelayHub(relayHub.address);
        });

        it("reverts if the forwarder is not trusted", async () => {
          const subject = paymasterAsRelayHub.preRelayedCall({
            request: stubbedRequest,
            relayData: stubbedRelayData,
          }, signature, approvalData, maxPossibleGas);

          expect(subject).to.be.revertedWith("ForwarderNotTrusted");
        });

        it("reverts if the value is not zero", async () => {
          await setupTrustedForwarder();

          const subject = paymasterAsRelayHub.preRelayedCall({
            request: { ...stubbedRequest, value: 1 },
            relayData: stubbedRelayData,
          }, signature, approvalData, maxPossibleGas);

          expect(subject).to.be.revertedWith("ValueTransferNotSupported");
        });

        it("reverts if there is paymaster data", async () => {
          await setupTrustedForwarder();

          const subject = paymasterAsRelayHub.preRelayedCall({
            request: stubbedRequest,
            relayData: { ...stubbedRelayData, paymasterData: "0xdeadbeef" },
          }, signature, approvalData, maxPossibleGas);

          expect(subject).to.be.revertedWith("InvalidPaymasterDataLength");
        });

        it("reverts if there is approval data", async () => {
          await setupTrustedForwarder();

          const subject = paymasterAsRelayHub.preRelayedCall({
            request: stubbedRequest,
            relayData: stubbedRelayData,
          }, signature, /* approvalData */ "0xdeadbeef", maxPossibleGas);

          expect(subject).to.be.revertedWith("InvalidApprovalDataLength");
        });

        it("reverts if the original caller isn't a Marketplace member", async () => {
          await setupTrustedForwarder();

          const subject = paymasterAsRelayHub.preRelayedCall({
            request: stubbedRequest,
            relayData: stubbedRelayData,
          }, signature, approvalData, maxPossibleGas);

          expect(subject).to.be.revertedWith("RequiresMarketplaceMembership");
        });
      });

      describe("when successful", () => {

        beforeEach(async () => {
          await setupTrustedForwarder();
          await issuerPaymaster.setRelayHub(relayHub.address);
        });

        it("returns empty string and boolean", async () => {
          marketplace.isMember.reset();
          marketplace.isMember.whenCalledWith(issuerMember.address).returns(true);
          marketplace.isMember.returns(false);

          const subject = await paymasterAsRelayHub.preRelayedCall({
            request: stubbedRequest,
            relayData: stubbedRelayData,
          }, signature, approvalData, maxPossibleGas);

          expect(subject).to.eql(["0x", false]);
        });
      });
    });

    describe("postRelayedCall", () => {
      it("reverts if not called by the relay hub", async () => {
        const stubbedRelayData = <GsnTypes.RelayDataStruct>{
          maxFeePerGas: 0,
          maxPriorityFeePerGas: 0,
          transactionCalldataGasUsed: 0,
          relayWorker: alice.address,
          paymaster: paymaster.address,
          forwarder: forwarder.address,
          paymasterData: "0x",
          clientId: 0,
        };

        const subject = paymaster.postRelayedCall(
          /* context */ "0x00000000",
          /* success */ true,
          /* gasUseWithoutPost */ 150000,
          stubbedRelayData
        );

        expect(subject).to.be.revertedWith("RequiresRelayHubCaller");
      });
    });

    describe("versionPaymaster", () => {
      it("returns the paymaster semver string", async () => {
        const subject = await paymaster.versionPaymaster();
        expect(subject).to.eq("3.0.0-beta.10+opengsn.tokensphere.ipaymaster");
      });
    });
  });

  // Settings and utility functions.

  describe("setRelayHub", () => {
    it("reverts if not permissioned", async () => {
      const subject = alicePaymaster.setRelayHub(relayHub.address);
      expect(subject).to.be.revertedWith("RequiresIssuerMemberCaller");
    });

    it("requires the address to be a valid relay hub", async () => {
      // Attempt to add the Issuer as the relay hub.
      const subject = issuerPaymaster.setRelayHub(issuer.address);
      expect(subject).to.be.revertedWith("InterfaceNotSupported");
    });

    it("sets the relay hub address", async () => {
      await issuerPaymaster.setRelayHub(relayHub.address);
      const subject = await alicePaymaster.getRelayHub();
      expect(subject).to.eq(relayHub.address);
    });
  });

  describe("setTrustedForwarder", () => {
    it("reverts if not permissioned", async () => {
      const subject = alicePaymaster.setTrustedForwarder(forwarder.address);
      expect(subject).to.be.revertedWith("RequiresIssuerMemberCaller");
    });

    it("requires the address to be a valid forwarder", async () => {
      const subject = issuerPaymaster.setTrustedForwarder(issuer.address);
      expect(subject).to.be.revertedWith("InterfaceNotSupported");
    });

    it("sets the trusted forwarder", async () => {
      await issuerPaymaster.setTrustedForwarder(forwarder.address);
      const subject = await alicePaymaster.getTrustedForwarder();
      expect(subject).to.eq(forwarder.address);
    });
  });

  describe("deposit", () => {
    it("reverts if Relay hub address not set", async () => {
      const subject = issuerPaymaster.deposit({ value: 100 });
      expect(subject).to.be.revertedWith("RelayHubAddressNotSet");
    });

    it("deposits sent amount to relay hub", async () => {
      // Firstly set the relay hub address.
      await issuerPaymaster.setRelayHub(relayHub.address);

      await issuerPaymaster.deposit({ value: 100 });
      expect(relayHub.depositFor).to.have.been.calledWith(
        paymaster.address
      );
    });
  });

  describe("withdrawRelayHubDepositTo", () => {
    it("reverts if not permissioned", async () => {
      const subject = alicePaymaster.withdrawRelayHubDepositTo(100, alice.address);
      expect(subject).to.be.revertedWith("RequiresIssuerMemberCaller");
    });

    it("withdraws the relay hub deposit to the given address", async () => {
      // Set the relay hub.
      await issuerPaymaster.setRelayHub(relayHub.address);

      await issuerPaymaster.withdrawRelayHubDepositTo(100, alice.address);
    });
  });
});
