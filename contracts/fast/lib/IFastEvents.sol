// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import '../../fast/Distribution.sol';
import '../../fast/Crowdfund.sol';


/**
 * @title FAST events inventory.
 * @notice An interface allowing to use events within the Diamond pattern without name colisions.
 * @dev The idea is that as several facets can emit the same events, we don't want to have to re-declare
 * the same event several time. This interface is a per-diamond central place for such event declaration.
 */
interface IFastEvents {
  /// Issuance related events.
  
  /**
   * @notice Emited whenever an issuance happens in a FAST.
   * @param amount is the amount of tokens that have been minted.
   * @param ref is the reference associated with the minting operation.
   * @param who is the account from which the minting operation originated.
   */
  event Minted(uint256 indexed amount, string indexed ref, address indexed who);
  /**
   * @notice Emited whenever an burning happens in a FAST.
   * @param amount is the amount of tokens that have been burnt.
   * @param ref is the reference associated with the burning operation.
   * @param who is the account from which the burning operation originated.
   */
  event Burnt(uint256 indexed amount, string indexed ref, address indexed who);

  /// Transfer and ERC20 stuff.

  /// @notice See `ERC20.Transfer`.
  event Transfer(address indexed from, address indexed to, uint256 value);
  /// @notice See `ERC20.Approval`.
  event Approval(address indexed owner, address indexed spender, uint256 value);
  /// @notice See `ERC20.Disapproval`.
  event Disapproval(address indexed owner, address indexed spender, uint256 value);
  /**
   * @notice As we augmented the ERC20 standard with a few concepts, we emit our custom events
   * in addition to the ERC20 ones.
   * @param spender is the account who performed the transfer.
   * @param from is the account from which the tokens will be debited from.
   * @param to is the account to which the tokens will be credited to.
   * @param value is the amount of tokens transfered.
   * @param ref is the optional reference associated with the transfer.
   */
  event FastTransfer(address indexed spender, address indexed from, address indexed to, uint256 value, string ref);

  /// Distribution related events.

  event DistributionDeployed(Distribution indexed distribution);

  /// Crowdfund related events.

  event CrowdfundDeployed(Crowdfund indexed crowdfund);

  /// General events.

  /**
   * @notice This is an event that is fired whenever any of some of the FAST parameters
   * change, so that the frontend can react to it and refresh the general header
   * for that fast as well as the baseball cards in the FASTs list.
   * @param transfersDisabled marks whether or not transfers are disabled by an issuer member at FAST level.
   * @param memberCount is the number of members in the FAST.
   * @param governorCount is the number of governors in the FAST.
   * @param totalSupply is the amount of tokens in circulation in the FAST.
   * @param reserveBalance is the balance of the zero-address (aka reserve) for the FAST.
   */
  event DetailsChanged(
    bool transfersDisabled,
    uint256 memberCount,
    uint256 governorCount,
    uint256 totalSupply,
    uint256 reserveBalance
  );
}
