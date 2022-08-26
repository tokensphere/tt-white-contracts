// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

/// @title ERC165 definition - interface implementation queryability.
interface IERC165 {
    /// @notice Queries if a contract implements an interface
    /// @param interfaceId The interface identifier, as specified in ERC165.
    /// @notice Interface identification is specified in ERC-165. This method uses less than 30,000 gas.
    /// @return A `bool` set to `true` if the contract implements `interfaceID` and
    /// `interfaceID` is not 0xffffffff.
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
