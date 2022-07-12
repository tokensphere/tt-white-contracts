// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


// WARNING: These events must be maintained 1:1 with LibFastEvents!
// They also should never be emitted directly, they only help us defining
// typescript types!
interface IFastEvents {
  event EthReceived(address indexed from, uint256 amount);
  event EthDrained(address indexed to, uint256 amount);
  event MemberAdded(address indexed governor);
  event MemberRemoved(address indexed governor);
  event GovernorAdded(address indexed governor);
  event GovernorRemoved(address indexed governor);
  event Minted(uint256 indexed amount, string indexed ref);
  event Burnt(uint256 indexed amount, string indexed ref);
  event TransferCreditsAdded(address indexed spcMember, uint256 amount);
  event TransferCreditsDrained(address indexed spcMember, uint256 amount);
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
  event Disapproval(address indexed owner, address indexed spender);
  event DetailsChanged(
    uint256 memberCount,
    uint256 governorCount,
    uint256 totalSupply,
    uint256 transferCredits,
    uint256 reserveBalance,
    uint256 ethBalance
  );
}
