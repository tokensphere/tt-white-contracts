// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../lib/LibAddressSet.sol';


/** @notice This library centralises shared functionality between FAST diamonds facets that have to do with token related logic.
 * @dev Note that if you feel like a function should be created inside this library, you might want to really consider
 * whether or not it is the right place for it. Any facet using a function from internal libraries see their bytecode
 * size increase, kind of defeating the benefits of using facets in the first place. So please keep it reasonable. 
 */
library LibFastToken {
  /// @notice The current version of the storage.
  uint16 internal constant STORAGE_VERSION = 1;
  /// @notice This is keccak256('Fast.storage.Token'):
  bytes32 internal constant STORAGE_SLOT = 0xb098747b87c5c0e2a32eb9b06725e9bad4263809bcda628ceadc1a686bcb8261;

  // Constants.

  string internal constant DEFAULT_TRANSFER_REFERENCE = 'Unspecified - via ERC20';

  // Data structures.

  /** @notice The token data structure required for operating any given FAST diamond.
   * @dev The `version` field is used to ensure that storage is at a known version during upgrades.
   */
  struct Data {
    /// @notice The latest intializer version that was called.
    uint16 version;
    // ERC20 related properties for this FAST Token.
    /// @notice The name of the FAST.
    string name;
    /// @notice The symbol for this FAST.
    string symbol;
    /// @notice The decimal points used by this FAST.
    uint8 decimals;
    /// @notice The amount of tokens in circulation.
    uint256 totalSupply;
    /** @notice Every time a transfer is executed, the credit decreases by the amount of said transfer.
     * It becomes impossible to transact once it reaches zero, and must be provisioned by an Issuer member.
    */
    uint256 transferCredits;
    /// @notice Our members balances are held here.
    mapping(address => uint256) balances;
    // Allowances are stored here.
    /// @notice Allowance amounts are stored in here, via mapping of `owner.spender.amount`
    mapping(address => mapping(address => uint256)) allowances;
    /// @notice A reverse lookup table allowing to retrieve allowances given by owner.
    mapping(address => LibAddressSet.Data) allowancesByOwner;
    /// @notice A reverse lookup table allowing to retrieve allowances given by spender.
    mapping(address => LibAddressSet.Data) allowancesBySpender;
    // Token holders
    LibAddressSet.Data tokenHolders;
  }

  /** @notice Returns the token storage for the calling FAST.
   * @return s a struct pointer for token FAST data storage.
   */
  function data()
      internal pure returns(Data storage s) {
    assembly {s.slot := STORAGE_SLOT}
  }
}
