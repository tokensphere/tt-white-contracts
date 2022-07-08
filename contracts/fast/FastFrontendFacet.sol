// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../lib/LibAddressSet.sol';
import '../lib/LibPaginate.sol';
import './lib/AFastFacet.sol';
import './lib/LibFastAccess.sol';
import './lib/LibFastToken.sol';


/** @title The SPC Smart Contract.
 *  @dev The SPC contract is the central place for top-level governorship. It requires that a
 *        first member address is passed at construction time.
 */
contract FastFrontendFacet is AFastFacet {
  using LibAddressSet for LibAddressSet.Data;

  // Events.

  // This is an event that is fired whenever any of some of the FAST parameters
  // change, so that the frontend can react to it and refresh the general header
  // for that fast as well as the baseball cards in the FASTs list.
  event DetailsChanged(
    uint256 memberCount,
    uint256 governorCount,
    uint256 totalSupply,
    uint256 transferCredits,
    uint256 reserveBalance,
    uint256 ethBalance
  );

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

  // Emitters.

  function emitDetailsChanged()
      external diamondInternal {
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
