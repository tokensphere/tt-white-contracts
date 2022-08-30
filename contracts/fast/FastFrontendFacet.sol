// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import './lib/AFastFacet.sol';
import './lib/LibFastAccess.sol';
import './lib/LibFastToken.sol';


contract FastFrontendFacet is AFastFacet {
  using LibAddressSet for LibAddressSet.Data;

  // Data structures.

  struct Details {
    address addr;
    string name;
    string symbol;
    uint8 decimals;
    uint256 totalSupply;
    uint256 transferCredits;
    bool isSemiPublic;
    bool hasFixedSupply;
    uint256 reserveBalance;
    uint256 ethBalance;
    uint256 memberCount;
    uint256 governorCount;
  }

  struct MemberDetails {
    address addr;
    uint256 balance;
    uint256 ethBalance;
    bool isGovernor;
  }

  struct GovernorDetails {
    address addr;
    uint256 ethBalance;
    bool isMember;
  }
  // Emitters.

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
