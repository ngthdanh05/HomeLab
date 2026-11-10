// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Product categories.
enum ProductType {
    Handicraft,
    Food,
    Experience
}

/// @notice PaymentSplitter functions used by Marketplace.
interface IPaymentSplitter {
    /// @dev Splits msg.value and rewards ECO to `buyer`.
    function splitPayment(address seller, address buyer, ProductType pType) external payable;
}

/// @notice ImpactBadge functions used by Marketplace.
interface IImpactBadge {
    /// @dev Mints a badge to `to`. Marketplace needs the minter role.
    function mint(address to, ProductType pType) external returns (uint256 tokenId);
}
