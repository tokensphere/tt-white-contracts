// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../interfaces/ICustomErrors.sol";
import "../lib/LibAddressSet.sol";
import "../lib/LibPaginate.sol";
import "../lib/LibHelpers.sol";
import "../fast/FastTopFacet.sol";
import "../fast/FastTokenFacet.sol";
import "./lib/AIssuerFacet.sol";
import "./lib/LibIssuer.sol";

contract IssuerTopFacet is AIssuerFacet {
  using LibAddressSet for LibAddressSet.Data;

  // FAST management related methods.

  /**
   * @notice Queries whether a given address is a known and registered FAST contract.
   * @param fast The address of the contract to check.
   * @return A boolean.
   */
  function isFastRegistered(address fast) external view returns (bool) {
    return LibIssuer.data().fastSet.contains(fast);
  }

  /**
   * @notice Allows to retrieve the address of a FAST diamond given its symbol.
   * @param symbol The symbol of the FAST diamond to get the address of.
   * @return The address of the corresponding FAST diamond, or the Zero Address if not found.
   */
  function fastBySymbol(string calldata symbol) external view returns (address) {
    return LibIssuer.data().fastSymbols[symbol];
  }

  /**
   * @notice Allows the registration of a given FAST diamond with this Issuer.
   * @param fast The address of the FAST diamond to be registered.
   * @notice Requires that the caller is a member of this Issuer.
   * @notice Emits a `FastRegistered` event.
   */
  function registerFast(address fast) external onlyMember(msg.sender) {
    LibIssuer.Data storage s = LibIssuer.data();
    string memory symbol = FastTokenFacet(fast).symbol();
    if (s.fastSymbols[symbol] != address(0)) {
      revert ICustomErrors.DuplicateEntry();
    }

    // Add the FAST to our list.
    s.fastSet.add(fast, false);
    // Add the fast symbol to our list.
    s.fastSymbols[symbol] = fast;

    // Emit!
    emit FastRegistered(fast);
  }

  /**
   * @notice Allows the unregistration of a given FAST diamond with this Issuer.
   * @param fast The address of the FAST diamond to be unregistered.
   * @notice Requires that the caller is a member of this Issuer.
   * @notice Emits a `FastUnregistered` event.
   */
  function unregisterFast(address fast) external onlyMember(msg.sender) {
    LibIssuer.Data storage s = LibIssuer.data();
    string memory symbol = FastTokenFacet(fast).symbol();

    // Disable transfers in the FAST.
    FastTopFacet(fast).setTransfersDisabled(true);

    // Remove the FAST from our lists.
    s.fastSet.remove(fast, false);
    delete s.fastSymbols[symbol];

    // Emit!
    emit FastUnregistered(fast);
  }

  /**
   * @notice Counts the number of FAST diamonds registered with this Issuer.
   * @return The number of FAST diamonds registered with this Issuer.
   */
  function fastCount() external view returns (uint256) {
    return LibIssuer.data().fastSet.values.length;
  }

  /**
   * @notice Paginates the FAST diamonds registered with this Issuer based on a starting cursor and a number of records per page.
   * @param cursor The index at which to start.
   * @param perPage How many records should be returned at most.
   * @return A `address[]` list of values at most `perPage` big.
   * @return A `uint256` index to the next page.
   */
  function paginateFasts(uint256 cursor, uint256 perPage) external view returns (address[] memory, uint256) {
    return LibPaginate.addresses(LibIssuer.data().fastSet.values, cursor, perPage);
  }

  /**
   * @notice Allows an issuer member to move collected ERC20 fees from this contract
   * to an arbitrary address.
   * @param token is the address of the ERC20 to be collected.
   * @param amount is how much should be moved from the ERC20 to the collection address.
   * @param to is the collection address - eg the address that will receive the ERC20 tokens.
   */
  function transferERC20Tokens(IERC20 token, uint256 amount, address to) public onlyMember(msg.sender) {
    require(token.transfer(to, amount));
  }

  /**
   * @notice Allows to assign FASTs to groups.
   * @param fast The FAST address to assign.
   * @param newGroup The name of the group in which the FAST should be placed.
   */
  function setFastGroup(address fast, string calldata newGroup) external onlyMember(msg.sender) {
    string memory oldGroup = FastTopFacet(fast).group();
    // Remove FAST from old group.
    if (bytes(oldGroup).length > 0) LibIssuer.data().fastGroups[oldGroup].remove(fast, false);
    // Add FAST to new group.
    if (bytes(newGroup).length > 0) LibIssuer.data().fastGroups[newGroup].add(fast, false);
    // Set group name at FAST level.
    FastTopFacet(fast).setGroup(newGroup);
    // Emit!
    emit FastGroupChanged(fast, oldGroup, newGroup);
  }

  /**
   * @notice Paginates the FAST diamonds registered with this Issuer based on a group, starting cursor and a number of records per page.
   * @param group The group to paginate.
   * @param cursor The index at which to start.
   * @param perPage How many records should be returned at most.
   * @return A `address[]` list of values at most `perPage` big.
   * @return A `uint256` index to the next page.
   */
  function paginateFastsInGroup(
    string calldata group,
    uint256 cursor,
    uint256 perPage
  ) external view returns (address[] memory, uint256) {
    return LibPaginate.addresses(LibIssuer.data().fastGroups[group].values, cursor, perPage);
  }
}
