// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


/** @notice An interface allowing to use events within the Diamond pattern without name colisions.
 * @dev The idea is that as several facets can emit the same events, we don't want to have to re-declare
 * the same event several time. This interface is a per-diamond central place for such event declaration.
 */
interface IFastEvents {
  // IHasMembers.

  /** @notice Emited when a member is added to the implementing contract.
   * @param member is the address of the added member.
   */
  event MemberAdded(address indexed member);
  /** @notice Emited when a member is removed to the implementing contract.
   * @param member is the address of the removed member.
   */
  event MemberRemoved(address indexed member);

  // IHasGovernors.

  /** @notice Emited when a governor is added to the implementing contract.
   * @param governor is the address of the added governor.
   */
  event GovernorAdded(address indexed governor);
  /** @notice Emited when a governor is removed to the implementing contract.
   * @param governor is the address of the removed member.
   */
  event GovernorRemoved(address indexed governor);

  // Issuance related events.
  /** @notice Emited whenever an issuance happens in a FAST.
   * @param amount is the amount of tokens that have been minted.
   * @param ref is the reference associated with the minting operation.
   */
  event Minted(uint256 indexed amount, string indexed ref);
  /** @notice Emited whenever an burning happens in a FAST.
   * @param amount is the amount of tokens that have been burnt.
   * @param ref is the reference associated with the burning operation.
   */
  event Burnt(uint256 indexed amount, string indexed ref);

  // Transfer credits related events.
  /** @notice Emited whenever transfer credits increase inside a FAST.
   * @param issuerMember is the address of the Issuer member who performed the operation.
   * @param amount is the number of issued transfer credits.
   */
  event TransferCreditsAdded(address indexed issuerMember, uint256 amount);
  /** @notice Emited whenever transfer credits are drained inside a FAST.
   * @param issuerMember is the address of the Issuer member who performed the operation.
   * @param amount is the number of drained transfer credits.
   */
  event TransferCreditsDrained(address indexed issuerMember, uint256 amount);

  // ERC20 stuff.

  /// @notice See `ERC20.Transfer`.
  event Transfer(address indexed from, address indexed to, uint256 value);
  /// @notice See `ERC20.Approval`.
  event Approval(address indexed owner, address indexed spender, uint256 value);
  /// @notice See `ERC20.Disapproval`.
  event Disapproval(address indexed owner, address indexed spender);

  // General events.

  /** @notice This is an event that is fired whenever any of some of the FAST parameters
   * change, so that the frontend can react to it and refresh the general header
   * for that fast as well as the baseball cards in the FASTs list.
   * @param memberCount is the number of members in the FAST.
   * @param governorCount is the number of governors in the FAST.
   * @param totalSupply is the amount of tokens in circulation in the FAST.
   * @param transferCredits represents how many transfer credits are available inside the FAST.
   * @param reserveBalance is the balance of the zero-address (aka reserve) for the FAST.
   * @param ethBalance is the amount of Eth locked in the FAST.
   */
  event DetailsChanged(
    uint256 memberCount,
    uint256 governorCount,
    uint256 totalSupply,
    uint256 transferCredits,
    uint256 reserveBalance,
    uint256 ethBalance
  );
}
