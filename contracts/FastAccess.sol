// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import './interfaces/IFastAccess.sol';
import './FastRegistry.sol';
import './lib/AddressSetLib.sol';


/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract FastAccess is Initializable, IFastAccess {
  using AddressSetLib for AddressSetLib.Data;

  struct Flags {
    bool isGovernor;
    bool isMember;
  }

  // This is where the parent SPC is deployed.
  FastRegistry public reg;

  // We hold list of governors and members in there.
  AddressSetLib.Data governorList;
  AddressSetLib.Data memberList;

  /// Events.

  event GovernorAdded(address indexed governor);
  event GovernorRemoved(address indexed governor);
  event MemberAdded(address indexed member);
  event MemberRemoved(address indexed member);

  /// Public stuff.

  function initialize(FastRegistry _reg, address governor)
      initializer
      external {
    reg = _reg;
    memberList.add(governor);
    governorList.add(governor);
  }

  /// Governance management.

  function governors()
      external view returns(address[] memory) {
    return governorList.values;
  }

  function isGovernor(address _a)
      public view override returns(bool) {
    return governorList.contains(_a);
  }

  function addGovernor(address _a)
      spcOrGovernance(msg.sender)
      public {
    governorList.add(_a);
    emit GovernorAdded(_a);
  }

  function removeGovernor(address _a)
      spcOrGovernance(msg.sender)
      public {
    require(msg.sender != _a, 'Cannot self-destruct');
    governorList.remove(_a);
    emit GovernorRemoved(_a);
  }

  /// Members.

  function members()
      external view returns(address[] memory) {
    return memberList.values;
  }

  function isMember(address _a)
      public view override returns(bool) {
    return memberList.contains(_a);
  }

  function addMember(address _a)
      governance(msg.sender)
      public override {
    memberList.add(_a);
    emit MemberAdded(_a);
  }

  function removeMember(address _a)
      governance(msg.sender)
      public {
    memberList.remove(_a);
    emit MemberRemoved(_a);
  }

  /// Flags.

  function flags(address _a)
      public view returns(Flags memory) {
    return
      Flags({
        isGovernor: isGovernor(_a),
        isMember: isMember(_a)
      });
  }

  function setFlags(address _a, Flags calldata _flags)
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

  modifier spcOrGovernance(address a) {
    require(
      reg.spc().isGovernor(a) || governorList.contains(a),
      'Missing governorship'
    );
    _;
  }

  modifier governance(address a) {
    require(governorList.contains(a), 'Missing governorship');
    _;
  }
}
