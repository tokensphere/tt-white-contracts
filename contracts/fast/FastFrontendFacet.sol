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
    /// @notice The default crowdfunds basis point fee.
    uint32 crowdfundsDefaultBasisPointsFee;
    /// @notice The reserve balance.
    uint256 reserveBalance;
    /// @notice The number of members the FAST has.
    uint256 memberCount;
    /// @notice The number of governors for the FAST.
    uint256 governorCount;
  }

  /**
   * @notice Member level details.
   * @dev This struct shouldn't be used in internal storage.
   */
  struct PrivilegesDetails {
    /// @notice The Member's address.
    address addr;
    /// @notice The Member's balance.
    uint256 balance;
    /// @notice The Member's ETH balance.
    uint256 ethBalance;
    /// @notice Whether or not the address is a Member.
    bool isMember;
    /// @notice Whether or not the address is a Governor.
    bool isGovernor;
    /// @notice Automaton flags assigned to this address.
    uint32 automatonPrivileges;
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
      crowdfundsDefaultBasisPointsFee: LibFastCrowdfunds.data().crowdfundsDefaultBasisPointsFee,
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
        crowdfundsDefaultBasisPointsFee: LibFastCrowdfunds.data().crowdfundsDefaultBasisPointsFee,
        reserveBalance: tokenStorage.balances[LibHelpers.ZERO_ADDRESS],
        memberCount: AHasMembers(address(this)).memberCount(),
        governorCount: LibHasGovernors.data().governorSet.values.length
      });
  }

  /**
   * @notice Gets detailed address privileges details.
   * @param addr The address to get the privileges for.
   * @return A FAST member's details, see `MemberDetails`.
   */
  function detailedPrivileges(address addr) public view returns (PrivilegesDetails memory) {
    return
      PrivilegesDetails({
        addr: addr,
        balance: LibFastToken.data().balances[addr],
        ethBalance: (payable(addr).balance),
        isMember: AHasMembers(address(this)).isMember(addr),
        isGovernor: AHasGovernors(address(this)).isGovernor(addr),
        automatonPrivileges: AHasAutomatons(address(this)).automatonPrivileges(addr)
      });
  }

  function paginateDetailedMembers(
    uint256 index,
    uint256 perPage
  ) external view returns (PrivilegesDetails[] memory, uint256) {
    LibHasMembers.Data storage membersData = LibHasMembers.data();
    (address[] memory members, uint256 nextCursor) = LibPaginate.addresses(membersData.memberSet.values, index, perPage);
    PrivilegesDetails[] memory values = new PrivilegesDetails[](members.length);
    uint256 length = members.length;
    for (uint256 i = 0; i < length; ) {
      values[i] = detailedPrivileges(members[i]);
      unchecked {
        ++i;
      }
    }
    return (values, nextCursor);
  }

  function paginateDetailedGovernors(
    uint256 index,
    uint256 perPage
  ) external view returns (PrivilegesDetails[] memory, uint256) {
    (address[] memory governors, uint256 nextCursor) = LibPaginate.addresses(
      LibHasGovernors.data().governorSet.values,
      index,
      perPage
    );
    PrivilegesDetails[] memory values = new PrivilegesDetails[](governors.length);
    uint256 length = governors.length;
    for (uint256 i = 0; i < length; ) {
      values[i] = detailedPrivileges(governors[i]);
      unchecked {
        ++i;
      }
    }
    return (values, nextCursor);
  }

  function paginateDetailedDistributions(
    uint256 index,
    uint256 perPage
  ) external view returns (Distribution.Details[] memory, uint256) {
    (address[] memory distributions, uint256 nextCursor) = LibPaginate.addresses(
      LibFastDistributions.data().distributionSet.values,
      index,
      perPage
    );
    Distribution.Details[] memory values = new Distribution.Details[](distributions.length);
    uint256 length = distributions.length;
    for (uint256 i = 0; i < length; ) {
      values[i] = Distribution(distributions[i]).details();
      unchecked {
        ++i;
      }
    }
    return (values, nextCursor);
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
  ) external view returns (Crowdfund.Details[] memory, uint256) {
    (address[] memory crowdfunds, uint256 nextCursor) = LibPaginate.addresses(
      LibFastCrowdfunds.data().crowdfundSet.values,
      index,
      perPage
    );
    Crowdfund.Details[] memory values = new Crowdfund.Details[](crowdfunds.length);
    uint256 length = crowdfunds.length;
    for (uint256 i = 0; i < length; ) {
      values[i] = Crowdfund(crowdfunds[i]).details();
      unchecked {
        ++i;
      }
    }
    return (values, nextCursor);
  }
}
