// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;


library LibAddressSet {
  /// @dev Represents a list of addresses.
  struct Data {
    mapping(address => uint256) indices;
    address[] values;
  }

  /**
   * @dev Adds an item into the storage set. If the address already exists in the
   *      set, the function reverts.
   * @param d is the internal data storage to use.
   * @param key is the address to be added.
   */
  function add(Data storage d, address key, bool noThrow)
      internal {
    bool exists = contains(d, key);
    if (noThrow && exists) { return; }
    require(!exists, 'Address already in set');
    d.indices[key] = d.values.length;
    d.values.push(key);
  }

  /**
   * @dev Removes an item from the storage set. If the address does not exist in the
   *      set, the function reverts.
   * @param d is the internal data storage to use.
   * @param key is the address to be removed.
   */
  function remove(Data storage d, address key, bool noThrow)
      internal {
    bool exists = contains(d, key);
    if (noThrow && !exists) { return; }
    require(exists, 'Address does not exist in set');
    uint256 lastIndex = d.values.length - 1;
    address keyToMove = d.values[lastIndex];
    uint256 idxToReplace = d.indices[key];
    d.indices[keyToMove] = idxToReplace;
    d.values[idxToReplace] = keyToMove;
    delete d.indices[key];
    d.values.pop();
  }

  /**
   * @dev Tests whether or not a given item already exists in the set.
   * @param d is the internal data storage to use.
   * @param key is the address to test.
   * @return a boolean.
   */
  function contains(Data storage d, address key)
      internal view returns(bool) {
    return d.values.length == 0
      ? false
      : d.values[d.indices[key]] == key;
  }
}
