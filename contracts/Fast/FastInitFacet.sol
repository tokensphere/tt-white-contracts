// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../Spc.sol';
import '../Exchange.sol';
import '../interfaces/IERC20.sol';    // Token.
import '../interfaces/IERC173.sol';   // Ownership.
import '../interfaces/IERC165.sol';   // Interface Support.
import '../interfaces/IERC1404.sol';  // Transfer Restriction.
import '../interfaces/IHasMembers.sol';
import '../interfaces/IHasGovernors.sol';
import '../lib/LibAddressSet.sol';
import './lib/index.sol';
import './interfaces/AFastFacet.sol';

/**
* @dev Note that although this contract doesn't explicitelly inherit from IERC173, ERC165, IDiamondLoupe etc, all
*       methods are in fact implemented by the underlaying Diamond proxy. It is therefore safe to
*       perform casts directly on the current contract address into these interfaces.
*/ 
contract FastInitFacet is AFastFacet {
  using LibAddressSet for LibAddressSet.Data;

  /// Initializers.

  struct InitializerParams {
    // Fast stuff.
    Spc spc;
    Exchange exchange;
    // Access stuff.
    address governor;
    // Token stuff.
    string name;
    string symbol;
    uint256 decimals;
    bool hasFixedSupply;
    bool isSemiPublic;
  }

  // TODO: WE NEED TO PROTECT THIS!!! See https://github.com/wighawag/hardhat-deploy/issues/327.
  function initialize(InitializerParams calldata params)
      external
      diamondOwner() {
    // Initialize top-level storage.
    LibFast.Data storage fastData = LibFast.data();
    fastData.spc = params.spc;
    fastData.exchange = params.exchange;
    
    // Initialize access storage.
    LibFastAccess.Data storage accessData = LibFastAccess.data();
    // Add the governor both as a governor and as a member.
    accessData.memberSet.add(params.governor, false);
    accessData.governorSet.add(params.governor, false);
    // TODO: Emit!
    // emit IHasGovernors.GovernorAdded(params.governor);
    // emit IHasMembers.MemberAdded(params.governor);

    // Initialize token storage.
    LibFastToken.Data storage tokenData = LibFastToken.data();
    // Set up ERC20 related stuff.
    (tokenData.name, tokenData.symbol, tokenData.decimals) =
      (params.name,   params.symbol,   params.decimals);
    tokenData.totalSupply = 0;
    // Initialize other internal stuff.
    (tokenData.hasFixedSupply, tokenData.isSemiPublic) =
      (params.hasFixedSupply,   params.isSemiPublic);
    tokenData.transferCredits = 0;
  }
}
