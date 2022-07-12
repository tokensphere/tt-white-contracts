// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


// WARNING: These events must be maintained 1:1 with IExchangeEvents!
library LibExchangeEvents {
  event MemberAdded(address indexed governor);
  event MemberRemoved(address indexed governor);
}
