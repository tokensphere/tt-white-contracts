// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../lib/LibHelpers.sol";
import "../lib/LibAddressSet.sol";
import "../lib/LibPaginate.sol";
import "./lib/AFastFacet.sol";
import "./lib/LibFastToken.sol";
import "./lib/LibFastDistributions.sol";
import "./lib/LibFastCrowdfunds.sol";

/**
 * @notice A facet dedicated to view / UI only methods. This facet should never hold any method that
 * is not either `pure` or `view`, except to emit events.
 */
contract FastFrontendFacet is AFastFacet {
  using LibAddressSet for LibAddressSet.Data;

  /// Data structures.

  /**
   * @notice This struct groups the common attributes of a FAST.
   * @dev This struct shouldn't be used in internal storage.
   */
  struct Details {
    /// @notice The `address` of the FAST.
    address addr;
    /// @notice The `name` of the FAST (ERC20).
    string name;
    /// @notice The `symbol` of the FAST (ERC20).
    string symbol;
    /// @notice The `decimals` of the FAST (ERC20).
    uint8 decimals;
    /// @notice The `totalSupply` of the FAST (ERC20).
    uint256 totalSupply;
    /// @notice Whether the FAST is semi public or not.
    bool isSemiPublic;
    /// @notice Whether the FAST has a fixed supply or continious.
    bool hasFixedSupply;
    /// @notice Whether the transfers are enabled or not for this FAST.
    bool transfersDisabled;
    /// @notice The reserve balance.
    uint256 reserveBalance;
    /// @notice The number of members the FAST has.
    uint256 memberCount;
    /// @notice The number of governors for the FAST.
    uint256 governorCount;
  }

  /**
   * @notice Governor level details.
   * @dev Note that **this struct shouldn't be used in internal storage**.
   */
  struct GovernorDetails {
    /// @notice The Governor's address.
    address addr;
    /// @notice The Governor's ETH balance.
    uint256 ethBalance;
    /// @notice Whether the Governor is also a Member.
    bool isMember;
  }

  /**
   * @notice Member level details.
   * @dev This struct shouldn't be used in internal storage.
   */
  struct MemberDetails {
    /// @notice The Member's address.
    address addr;
    /// @notice The Member's balance.
    uint256 balance;
    /// @notice The Member's ETH balance.
    uint256 ethBalance;
    /// @notice Whether the Member is also a Governor.
    bool isGovernor;
  }

  /**
   * @notice Crowdfund details.
   * @dev This struct shouldn't be used in internal storage.
   */
  struct CrowdfundDetails {
    uint16 VERSION;
    Crowdfund.Params params;
    Crowdfund.Phase phase;
    uint256 creationBlock;
    uint256 collected;
    uint256 feeAmount;
  }

  /**
   * @notice Distribution details.
   * @dev This struct shouldn't be used in internal storage.
   */
  struct DistributionDetails {
    uint16 VERSION;
    Distribution.Params params;
    Distribution.Phase phase;
    uint256 creationBlock;
    uint256 fee;
    uint256 available;
  }

  /// Emitters.

  /**
   * @notice Called by diamond facets, signals that FAST details may have changed.
   *
   * Business logic:
   * - Modifiers:
   *   - Requires the caller to be another facet of the diamond.
   * Emits `DetailsChanged`, see `IFastEvents.DetailsChanged`
   */
  function emitDetailsChanged() external onlyDiamondFacet {
    LibFastToken.Data storage tokenData = LibFastToken.data();
    emit DetailsChanged({
      transfersDisabled: LibFast.data().transfersDisabled,
      memberCount: LibHasMembers.data().memberSet.values.length,
      governorCount: LibHasGovernors.data().governorSet.values.length,
      totalSupply: tokenData.totalSupply,
      reserveBalance: tokenData.balances[LibHelpers.ZERO_ADDRESS]
    });
  }

  /// Public functions.

  /**
   * @notice Gets the details of a FAST.
   * @return The details for the current FAST, see `Details`.
   */
  function details() public view returns (Details memory) {
    LibFast.Data storage topStorage = LibFast.data();
    LibFastToken.Data storage tokenStorage = LibFastToken.data();
    return
      Details({
        addr: address(this),
        name: tokenStorage.name,
        symbol: tokenStorage.symbol,
        decimals: tokenStorage.decimals,
        totalSupply: tokenStorage.totalSupply,
        isSemiPublic: topStorage.isSemiPublic,
        hasFixedSupply: topStorage.hasFixedSupply,
        transfersDisabled: topStorage.transfersDisabled,
        reserveBalance: tokenStorage.balances[LibHelpers.ZERO_ADDRESS],
        memberCount: AHasMembers(address(this)).memberCount(),
        governorCount: LibHasGovernors.data().governorSet.values.length
      });
  }

  /**
   * @notice Gets detailed governor details.
   * @return GovernorDetails See: `GovernorDetails`.
   */
  function detailedGovernor(address governor) public view returns (GovernorDetails memory) {
    return
      GovernorDetails({
        addr: governor,
        ethBalance: (payable(governor).balance),
        isMember: AHasMembers(address(this)).isMember(governor)
      });
  }

  function paginateDetailedGovernors(
    uint256 index,
    uint256 perPage
  ) external view returns (GovernorDetails[] memory, uint256) {
    (address[] memory governors, uint256 nextCursor) = LibPaginate.addresses(
      LibHasGovernors.data().governorSet.values,
      index,
      perPage
    );
    GovernorDetails[] memory values = new GovernorDetails[](governors.length);
    uint256 length = governors.length;
    for (uint256 i = 0; i < length; ) {
      values[i] = detailedGovernor(governors[i]);
      unchecked {
        ++i;
      }
    }
    return (values, nextCursor);
  }

  /**
   * @notice Gets detailed member details.
   * @return A FAST member's details, see `MemberDetails`.
   */
  function detailedMember(address member) public view returns (MemberDetails memory) {
    return
      MemberDetails({
        addr: member,
        balance: LibFastToken.data().balances[member],
        ethBalance: (payable(member).balance),
        isGovernor: LibHasGovernors.data().governorSet.contains(member)
      });
  }

  function paginateDetailedMembers(uint256 index, uint256 perPage) external view returns (MemberDetails[] memory, uint256) {
    LibHasMembers.Data storage membersData = LibHasMembers.data();
    (address[] memory members, uint256 nextCursor) = LibPaginate.addresses(membersData.memberSet.values, index, perPage);
    MemberDetails[] memory values = new MemberDetails[](members.length);
    uint256 length = members.length;
    for (uint256 i = 0; i < length; ) {
      values[i] = detailedMember(members[i]);
      unchecked {
        ++i;
      }
    }
    return (values, nextCursor);
  }

  /**
   * @notice Gets detailed distribution information.
   * @param addr The address of the distribution.
   * @return See: `DistributionDetails`.
   */
  function detailedDistribution(address addr) public view returns (DistributionDetails memory) {
    Distribution distribution = Distribution(addr);
    return
      DistributionDetails({
        VERSION: distribution.VERSION(),
        params: distribution.paramsStruct(),
        phase: distribution.phase(),
        creationBlock: distribution.creationBlock(),
        fee: distribution.fee(),
        available: distribution.available()
      });
  }

  function paginateDetailedDistributions(
    uint256 index,
    uint256 perPage
  ) external view returns (DistributionDetails[] memory, uint256) {
    (address[] memory distributions, uint256 nextCursor) = LibPaginate.addresses(
      LibFastDistributions.data().distributionSet.values,
      index,
      perPage
    );
    DistributionDetails[] memory values = new DistributionDetails[](distributions.length);
    uint256 length = distributions.length;
    for (uint256 i = 0; i < length; ) {
      values[i] = detailedDistribution(distributions[i]);
      unchecked {
        ++i;
      }
    }
    return (values, nextCursor);
  }

  /**
   * @notice Gets detailed crowdfund information.
   * @param addr The address of the crowdfund.
   * @return See: `CrowdfundDetails`.
   */
  function detailedCrowdfund(address addr) public view returns (CrowdfundDetails memory) {
    Crowdfund crowdfund = Crowdfund(addr);
    return
      CrowdfundDetails({
        VERSION: crowdfund.VERSION(),
        params: crowdfund.paramsStruct(),
        phase: crowdfund.phase(),
        creationBlock: crowdfund.creationBlock(),
        collected: crowdfund.collected(),
        feeAmount: crowdfund.feeAmount()
      });
  }

  /**
   * @dev Paginates detailed crowdfunds.
   * @param index The index of the first crowdfund to return.
   * @param perPage The number of crowdfunds to return.
   * @return An array of crowdfund details, see `CrowdfundDetails`.
   */
  function paginateDetailedCrowdfunds(
    uint256 index,
    uint256 perPage
  ) external view returns (CrowdfundDetails[] memory, uint256) {
    (address[] memory crowdfunds, uint256 nextCursor) = LibPaginate.addresses(
      LibFastCrowdfunds.data().crowdfundSet.values,
      index,
      perPage
    );
    CrowdfundDetails[] memory values = new CrowdfundDetails[](crowdfunds.length);
    uint256 length = crowdfunds.length;
    for (uint256 i = 0; i < length; ) {
      values[i] = detailedCrowdfund(crowdfunds[i]);
      unchecked {
        ++i;
      }
    }
    return (values, nextCursor);
  }
}
