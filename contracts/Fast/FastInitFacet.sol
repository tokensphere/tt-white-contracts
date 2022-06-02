// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '../interfaces/ISpc.sol';
import '../interfaces/IExchange.sol';
import '../interfaces/IHasMembers.sol';
import '../interfaces/IHasGovernors.sol';
import '../lib/LibAddressSet.sol';
import './lib/LibFast.sol';
import './lib/LibFastAccess.sol';
import './lib/LibFastToken.sol';

contract FastInitFacet {
  using LibAddressSet for LibAddressSet.Data;

  /// Initializers.

  struct InitializerParams {
    // Fast stuff.
    ISpc spc;
    IExchange exchange;
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
      external {
    // Initialize top-level storage.
    LibFast.Data storage fastData = LibFast.data();
    fastData.spc = params.spc;
    fastData.exchange = params.exchange;
    
    // Initialize access storage.
    LibFastAccess.Data storage accessData = LibFastAccess.data();
    // Add the governor both as a governor and as a member.
    accessData.memberSet.add(params.governor, false);
    accessData.governorSet.add(params.governor, false);
    // Emit!
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

  /// Modifiers.

  modifier diamondInternal() {
    require(msg.sender == address(this), 'Cannot be called directly');
    _;
  }
}
