// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import './lib/AFastFacet.sol';
import './lib/LibFastAccess.sol';
import './lib/LibFastToken.sol';


contract FastFrontendFacet is AFastFacet {
  using LibAddressSet for LibAddressSet.Data;

  // Data structures.

  /// @notice This struct groups the common attributes of a FAST.
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
    /// @notice The number of transfer credits the FAST currently has.
    uint256 transferCredits;
    /// @notice Whether the FAST is semi public or not.
    bool isSemiPublic;
    /// @notice Whether the FAST has a fixed supply or continious.
    bool hasFixedSupply;
    /// @notice The reserve balance.
    uint256 reserveBalance;
    /// @notice The Ether balance.
    uint256 ethBalance;
    /// @notice The number of members the FAST has.
    uint256 memberCount;
    /// @notice The number of governors for the FAST.
    uint256 governorCount;
  }

  /// @notice Member level details.
  struct MemberDetails {
    /// @notice The Member's address.
    address addr;
    /// @notice The Member's balance.
    uint256 balance;
    uint256 ethBalance;
    /// @notice Whether the Member is also a Governor.
    bool isGovernor;
  }

  /// @notice Governor level details.
  struct GovernorDetails {
    /// @notice The Governor's address.
    address addr;
    uint256 ethBalance;
    /// @notice Whether the Governor is also a Member.
    bool isMember;
  }

  // Emitters.

  /** @notice Called by diamond facets, signals that FAST details may have changed.
   * Business logic:
   * - Modifiers:
   *   - Requires the caller to be another facet of the diamond.
   * Emits `DetailsChanged` - see: `IFastEvents.DetailsChanged`
   */
  function emitDetailsChanged()
      external onlyDiamondFacet {
    LibFastAccess.Data storage accessData = LibFastAccess.data();
    LibFastToken.Data storage tokenData = LibFastToken.data();
    emit DetailsChanged({
      memberCount: accessData.memberSet.values.length,
      governorCount: accessData.governorSet.values.length,
      totalSupply: tokenData.totalSupply,
      transferCredits: tokenData.transferCredits,
      reserveBalance: tokenData.balances[LibConstants.ZERO_ADDRESS],
      ethBalance: payable(address(this)).balance
    });
  }

  // Public functions.

  /** @notice Gets the details of a FAST.
   * @return Details See: `Details`.
   */
  function details()
      public view returns(Details memory) {
    LibFast.Data storage topStorage = LibFast.data();
    LibFastAccess.Data storage accessStorage = LibFastAccess.data();
    LibFastToken.Data storage tokenStorage = LibFastToken.data();
    return Details({
      addr: address(this),
      name: tokenStorage.name,
      symbol: tokenStorage.symbol,
      decimals: tokenStorage.decimals,
      totalSupply: tokenStorage.totalSupply,
      transferCredits: tokenStorage.transferCredits,
      isSemiPublic: topStorage.isSemiPublic,
      hasFixedSupply: topStorage.hasFixedSupply,
      reserveBalance: tokenStorage.balances[LibConstants.ZERO_ADDRESS],
      ethBalance: payable(address(this)).balance,
      memberCount: accessStorage.memberSet.values.length,
      governorCount: accessStorage.governorSet.values.length
    });
  }

  /** @notice Gets detailed member details.
   * @return MemberDetails See: `MemberDetails`.
   */
  function detailedMember(address member)
      public view returns(MemberDetails memory) {
    LibFastToken.Data storage tokenStorage = LibFastToken.data();
    LibFastAccess.Data storage accessStorage = LibFastAccess.data();
    return MemberDetails({
      addr: member,
      balance: tokenStorage.balances[member],
      ethBalance: member.balance,
      isGovernor: accessStorage.governorSet.contains(member)
    });
  }

  /** @notice Gets detailed governor details.
   * @return GovernorDetails See: `GovernorDetails`.
   */
  function detailedGovernor(address governor)
      public view returns(GovernorDetails memory) {
    LibFastAccess.Data storage accessStorage = LibFastAccess.data();
    return GovernorDetails({
      addr: governor,
      ethBalance: governor.balance,
      isMember: accessStorage.memberSet.contains(governor)
    });
  }

  function paginateDetailedMembers(uint256 index, uint256 perPage)
      external view returns(MemberDetails[] memory, uint256) {
    LibFastAccess.Data storage accessStorage = LibFastAccess.data();
    (address[] memory members, uint256 nextCursor) =
      LibPaginate.addresses(accessStorage.memberSet.values, index, perPage);
    MemberDetails[] memory values = new MemberDetails[](members.length);
    for (uint256 i = 0; i < members.length; ++i) {
      values[i] = detailedMember(members[i]);
    }
    return (values, nextCursor);
  }

  function paginateDetailedGovernors(uint256 index, uint256 perPage)
      external view returns(GovernorDetails[] memory, uint256) {
    LibFastAccess.Data storage accessStorage = LibFastAccess.data();
    (address[] memory governors, uint256 nextCursor) =
      LibPaginate.addresses(accessStorage.governorSet.values, index, perPage);
    GovernorDetails[] memory values = new GovernorDetails[](governors.length);
    for (uint256 i = 0; i < governors.length; ++i) {
      values[i] = detailedGovernor(governors[i]);
    }
    return (values, nextCursor);
  }
}
