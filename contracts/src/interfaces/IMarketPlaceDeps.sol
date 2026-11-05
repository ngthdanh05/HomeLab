// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Loại sản phẩm. ĐIỀU CHỈNH cho khớp với enum thực tế của dự án
///         (nếu đã khai báo ở file khác thì xoá ở đây và đổi import).
enum ProductType {
    Handicraft,
    Food,
    Experience
}

/// @notice Giao diện tối thiểu của PaymentSplitter mà Marketplace cần.
interface IPaymentSplitter {
    /// @dev Nhận ETH (msg.value), chia cho seller / treasury / platform và thưởng
    ///      EcoToken cho `buyer` (người mua thật, không phải Marketplace gọi hàm).
    function splitPayment(address seller, address buyer, ProductType pType) external payable;
}

/// @notice Giao diện tối thiểu của ImpactBadge mà Marketplace cần.
interface IImpactBadge {
    /// @dev Mint badge cho `to`. Marketplace phải có quyền minter.
    function mint(address to, ProductType pType) external returns (uint256 tokenId);
}
