import * as chai from "chai";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { deployments, ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { abiStructToObj, impersonateContract, stopImpersonating } from "../utils";
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
import { formatEther } from "ethers/lib/utils";
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
    alicePaymaster: PaymasterTopFacet;

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
        },
      },
      initWith: {
        marketplace: marketplace.address,
      },
    });

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

    relayHub.depositFor.reset();
  });

  // IERC165.

  describe("IERC165", () => {
    describe("supportsInterface", () => {
      it("registers supported interfaces")
      //   , async () => {
      // await paymaster.supportsInterface("0x01ffc9a7")

      // });
    });
  });

  // IPaymaster.

  describe("IPaymaster", () => {

    describe("getRelayHub", () => {
      it("returns the relay hub address", async () => {
        // Set the relay hub address.
        await alicePaymaster.setRelayHub(relayHub.address);

        const subject = await paymaster.getRelayHub();
        expect(subject).to.eq(relayHub.address);
      });
    });

    describe("getTrustedForwarder", () => {
      it("returns the trusted forwarder address", async () => {
        // Set the trusted forwarder.
        await alicePaymaster.setTrustedForwarder(forwarder.address);

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

      beforeEach(async () => {
        stubbedRequest = {
          from: issuerMember.address,
          to: issuer.address,
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
        const signature = "0x";
        const approvalData = "0x";
        const maxPossibleGas = 0;

        const subject = paymaster.preRelayedCall({
          request: stubbedRequest,
          relayData: stubbedRelayData,
        }, signature, approvalData, maxPossibleGas);

        expect(subject).to.be.revertedWith("RequiresRelayHubCaller");
      });

      describe("when called by the relay hub", () => {
        let relayHubCaller: PaymasterTopFacet;

        // Defaults.
        const signature = "0x";
        const approvalData = "0x";
        const maxPossibleGas = 0;

        beforeEach(async () => {
          alicePaymaster.setRelayHub(relayHub.address);

          await ethers.provider.send("hardhat_impersonateAccount", [relayHub.address]);
          relayHubCaller = paymaster.connect(await ethers.getSigner(relayHub.address));
        });

        afterEach(async () => await stopImpersonating(relayHub.address));

        it("reverts if the forwarder is not trusted", async () => {
          const subject = relayHubCaller.preRelayedCall({
            request: stubbedRequest,
            relayData: stubbedRelayData,
          }, signature, approvalData, maxPossibleGas);

          expect(subject).to.be.revertedWith("ForwarderNotTrusted");
        });

        it("reverts if the value is not zero", async () => {
          issuer.isTrustedForwarder.reset();
          issuer.isTrustedForwarder.returns(true);
          alicePaymaster.setTrustedForwarder(forwarder.address);

          const subject = relayHubCaller.preRelayedCall({
            request: { ...stubbedRequest, value: 1 },
            relayData: stubbedRelayData,
          }, signature, approvalData, maxPossibleGas);

          expect(subject).to.be.revertedWith("ValueTransferNotSupported");
        });

        it("reverts if there is paymaster data", async () => {
          issuer.isTrustedForwarder.reset();
          issuer.isTrustedForwarder.returns(true);
          alicePaymaster.setTrustedForwarder(forwarder.address);

          const subject = relayHubCaller.preRelayedCall({
            request: stubbedRequest,
            relayData: { ...stubbedRelayData, paymasterData: "0xdeadbeef" },
          }, signature, approvalData, maxPossibleGas);

          expect(subject).to.be.revertedWith("InvalidPaymasterDataLength");
        });

        it("reverts if there is approval data", async () => {
          issuer.isTrustedForwarder.reset();
          issuer.isTrustedForwarder.returns(true);
          alicePaymaster.setTrustedForwarder(forwarder.address);

          const subject = relayHubCaller.preRelayedCall({
            request: stubbedRequest,
            relayData: stubbedRelayData,
          }, signature, /* approvalData */ "0xdeadbeef", maxPossibleGas);

          expect(subject).to.be.revertedWith("InvalidApprovalDataLength");
        });

        it("reverts if the original caller isn't a Marketplace member", async () => {
          issuer.isTrustedForwarder.reset();
          issuer.isTrustedForwarder.returns(true);
          alicePaymaster.setTrustedForwarder(forwarder.address);

          const subject = relayHubCaller.preRelayedCall({
            request: stubbedRequest,
            relayData: stubbedRelayData,
          }, signature, approvalData, maxPossibleGas);

          expect(subject).to.be.revertedWith("RequiresMarketplaceMembership");
        });

        it("on success returns empty string and boolean", async () => {
          issuer.isTrustedForwarder.reset();
          issuer.isTrustedForwarder.returns(true);
          alicePaymaster.setTrustedForwarder(forwarder.address);

          marketplace.isMember.reset();
          marketplace.isMember.whenCalledWith(issuerMember.address).returns(true);
          marketplace.isMember.returns(false);

          const subject = await relayHubCaller.preRelayedCall({
            request: stubbedRequest,
            relayData: stubbedRelayData,
          }, signature, approvalData, maxPossibleGas);

          expect(subject).to.eql(["0x", false]);
        });
      });
    });

    describe("postRelayedCall", () => {
      it("reverts if not called by the relay hub", async () => {
        const stubbedRelayData = {
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
        expect(subject).to.eq("3.0.0-beta.9+opengsn.tokensphere.ipaymaster");
      });
    });
  });

  // Settings and utility functions.

  describe("setRelayHub", () => {
    it("reverts if not permissioned");

    it("requires the address to be a valid relay hub", async () => {
      // Attempt to add the Issuer as the relay hub.
      const subject = alicePaymaster.setRelayHub(issuer.address);
      expect(subject).to.be.revertedWith("InterfaceNotSupported");
    });

    it("sets the relay hub address", async () => {
      await alicePaymaster.setRelayHub(relayHub.address);
      const subject = await alicePaymaster.getRelayHub();
      expect(subject).to.eq(relayHub.address);
    });
  });

  describe("setTrustedForwarder", () => {
    it("reverts if not permissioned");

    it("requires the address to be a valid forwarder", async () => {
      const subject = alicePaymaster.setTrustedForwarder(issuer.address);
      expect(subject).to.be.revertedWith("InterfaceNotSupported");
    });

    it("sets the trusted forwarder", async () => {
      await alicePaymaster.setTrustedForwarder(forwarder.address);
      const subject = await alicePaymaster.getTrustedForwarder();
      expect(subject).to.eq(forwarder.address);
    });
  });

  describe("deposit", () => {
    it("reverts if Relay hub address not set", async () => {
      const subject = alicePaymaster.deposit({ value: 100 });
      expect(subject).to.be.revertedWith("RelayHubAddressNotSet");
    });

    it("deposits sent amount to relay hub", async () => {
      // Firstly set the relay hub address.
      await paymaster.setRelayHub(relayHub.address);

      await alicePaymaster.deposit({ value: 100 });
      expect(relayHub.depositFor).to.have.been.calledWith(
        paymaster.address
      );
    });
  });

  describe("withdrawRelayHubDepositTo", () => {
    it("reverts if not permissioned");

    it("withdraws the relay hub deposit to the given address", async () => {
      // Set the relay hub.
      await paymaster.setRelayHub(relayHub.address);

      await alicePaymaster.withdrawRelayHubDepositTo(100, alice.address);
    });
  });
});
