// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;


interface IFastEvents {
  // ETH provisioning events.

  /** @dev Emited when someone provisions this Issuer with Eth.
   *  @param from The sender of the Eth.
   *  @param amount The quantity of Eth, expressed in Wei.
   */
  event EthReceived(address indexed from, uint256 amount);
  /** @dev Emited when Eth is drained from this Issuer.
   *  @param to The caller and recipient of the drained Eth.
   *  @param amount The quantity of Eth that was drained, expressed in Wei.
   */
  event EthDrained(address indexed to, uint256 amount);

  // IHasMembers.

  event MemberAdded(address indexed member);
  event MemberRemoved(address indexed member);

  // IHasGovernors.

  event GovernorAdded(address indexed governor);
  event GovernorRemoved(address indexed governor);

  // Token related events.

  // Issuance related events.
  event Minted(uint256 indexed amount, string indexed ref);
  event Burnt(uint256 indexed amount, string indexed ref);

  // Transfer credits related events.
  event TransferCreditsAdded(address indexed issuerMember, uint256 amount);
  event TransferCreditsDrained(address indexed issuerMember, uint256 amount);

  // ERC20 stuff.
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
  event Disapproval(address indexed owner, address indexed spender);

  // General events.

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
}
