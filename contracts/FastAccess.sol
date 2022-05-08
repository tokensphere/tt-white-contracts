// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import './interfaces/IFastAccess.sol';
import './FastRegistry.sol';
import './lib/AddressSetLib.sol';
import './lib/PaginationLib.sol';


/// @custom:oz-upgrades-unsafe-allow external-library-linking
/**
* @dev The FAST Access Smart Contract is the source of truth when it comes to
* permissioning and ACLs within a given FAST network.
*/
/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract FastAccess is Initializable, IFastAccess {
  using AddressSetLib for AddressSetLib.Data;

  /// @dev This is where the parent SPC is deployed.
  FastRegistry public reg;

  /// @dev We hold list of governors in here.
  AddressSetLib.Data governorList;
  /// @dev We keep the list of members in here.
  AddressSetLib.Data memberList;

  /// Events.

  event GovernorAdded(address indexed governor);
  event GovernorRemoved(address indexed governor);
  event MemberAdded(address indexed member);
  event MemberRemoved(address indexed member);

  /// Public stuff.

  /**
  * @dev Designated initializer - replaces the constructor as we are
  * using the proxy pattern allowing for logic upgrades.
  */
  function initialize(FastRegistry _reg, address governor)
      initializer
      external {
    reg = _reg;
    memberList.add(governor);
    governorList.add(governor);
  }

  /// Governorship related stuff.

  /**
   * @dev Returns a page of governors.
   */
  function governorsAt(uint256 index, uint256 perPage)
      public view returns(address[] memory, uint256) {
    return PaginationLib.addresses(governorList.values, index, perPage);
  }

  /**
   * @dev Queries whether a given address is a governor or not.
   */
  function isGovernor(address _a)
      public view override returns(bool) {
    return governorList.contains(_a);
  }

  /**
   * @dev Adds a governor to the governorship list.
   */
  function addGovernor(address _a)
      spcOrGovernance(msg.sender)
      public override {
    governorList.add(_a);
    emit GovernorAdded(_a);
  }

  /**
   * @dev Removes a governor from the governorship list.
   */
  function removeGovernor(address _a)
      spcOrGovernance(msg.sender)
      public {
    require(msg.sender != _a, 'Cannot self-destruct');
    governorList.remove(_a);
    emit GovernorRemoved(_a);
  }

  /// Membership related stuff.

  /**
   * @dev Returns a page of members.
   */
  function membersAt(uint256 cursor, uint256 perPage)
      public view returns(address[] memory, uint256) {
    return PaginationLib.addresses(memberList.values, cursor, perPage);
  }

  /**
   * @dev Queries whether a given address is a member or not.
   */
  function isMember(address _a)
      public view override returns(bool) {
    return memberList.contains(_a);
  }

  /**
   * @dev Adds a member to the membership list.
   */
  function addMember(address _a)
      governance(msg.sender)
      public override {
    memberList.add(_a);
    emit MemberAdded(_a);
  }

  /**
   * @dev Removes a member from the membership list.
   */
  function removeMember(address _a)
      governance(msg.sender)
      public {
    memberList.remove(_a);
    emit MemberRemoved(_a);
  }

  /// Flags.

  /**
   * @dev Retrieves flags for a given address.
   */
  function flags(address _a)
      public view returns(IFastAccess.Flags memory) {
    return
      IFastAccess.Flags({
        isGovernor: isGovernor(_a),
        isMember: isMember(_a)
      });
  }

  /**
   * @dev Sets all flags for a given address, in one go.
   */
  function setFlags(address _a, IFastAccess.Flags calldata _flags)
      governance(msg.sender)
      external {
    if (isGovernor(_a) != _flags.isGovernor) {
      _flags.isGovernor ? addGovernor(_a) : removeGovernor(_a);
    }
    if (isMember(_a) != _flags.isMember) {
      _flags.isMember ? addMember(_a) : removeMember(_a);
    }
  }

  // Modifiers.

  modifier spcOrGovernance(address _a) {
    require(
      reg.spc().isGovernor(_a) || governorList.contains(_a),
      'Missing governorship'
    );
    _;
  }

  modifier governance(address _a) {
    require(governorList.contains(_a), 'Missing governorship');
    _;
  }
}
