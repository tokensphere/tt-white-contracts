// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import './lib/AFastFacet.sol';
import './FastAccessFacet.sol';
import './FastTokenFacet.sol';


/** @title The SPC Smart Contract.
 *  @dev The SPC contract is the central place for top-level governorship. It requires that a
 *        first member address is passed at construction time.
 */
contract FastFrontendFacet is AFastFacet {
  using LibAddressSet for LibAddressSet.Data;

  // Data structures.

  struct Details {
    address addr;
    string name;
    string symbol;
    uint256 decimals;
    uint256 totalSupply;
    uint256 transferCredits;
    bool isSemiPublic;
    bool hasFixedSupply;
    uint256 reserveBalance;
    uint256 memberCount;
    uint256 governorCount;
  }

  struct MemberDetails {
    address addr;
    uint256 balance;
    uint256 ethBalance;
    bool isGovernor;
  }

  // Public functions.

  function details()
      public view returns(Details memory) {
    LibFastToken.Data storage tokenStorage = LibFastToken.data();
    LibFastAccess.Data storage accessStorage = LibFastAccess.data();
    return Details({
      addr: address(this),
      name: tokenStorage.name,
      symbol: tokenStorage.symbol,
      decimals: tokenStorage.decimals,
      totalSupply: tokenStorage.totalSupply,
      transferCredits: tokenStorage.transferCredits,
      isSemiPublic: tokenStorage.isSemiPublic,
      hasFixedSupply: tokenStorage.hasFixedSupply,
      reserveBalance: tokenStorage.balances[LibConstants.ZERO_ADDRESS],
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
}
