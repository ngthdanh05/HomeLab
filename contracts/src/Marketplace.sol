// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ProductType, IPaymentSplitter, IImpactBadge} from "./interfaces/IMarketPlaceDeps.sol";

/// @title Marketplace
/// @notice D2C marketplace: nghệ nhân tạo listing, du khách mua trực tiếp.
///         Tiền được chia qua PaymentSplitter, người mua nhận ImpactBadge.
contract Marketplace is Ownable, ReentrancyGuard {
    // ───────────────────────────── Types ─────────────────────────────

    struct Listing {
        uint256 id;
        address seller;
        uint256 price;
        ProductType pType;
        string metadataURI;
        bool isActive;
    }

    // ───────────────────────────── Storage ───────────────────────────

    IPaymentSplitter public paymentSplitter;
    IImpactBadge public impactBadge;

    /// @dev ID bắt đầu từ 1; ID 0 nghĩa là "không tồn tại".
    uint256 public nextListingId = 1;

    mapping(uint256 => Listing) private _listings;

    // ───────────────────────────── Events ────────────────────────────

    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        uint256 price,
        ProductType pType,
        string metadataURI
    );
    event ListingPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );
    event ListingCancelled(uint256 indexed listingId, address indexed cancelledBy);

    // ───────────────────────────── Errors ────────────────────────────

    error ZeroAddress();
    error ZeroPrice();
    error EmptyMetadataURI();
    error ListingNotFound(uint256 listingId);
    error ListingNotActive(uint256 listingId);
    error InsufficientPayment(uint256 required, uint256 sent);
    error NotSellerOrOwner(address caller);
    error RefundFailed();

    // ───────────────────────────── Constructor ───────────────────────

    constructor(address splitter, address badge, address initialOwner) Ownable(initialOwner) {
        if (splitter == address(0) || badge == address(0)) revert ZeroAddress();
        paymentSplitter = IPaymentSplitter(splitter);
        impactBadge = IImpactBadge(badge);
    }

    // ───────────────────────────── External ──────────────────────────

    /// @notice Tạo listing mới. msg.sender là seller.
    /// @dev TODO: nếu có ArtisanRegistry/role, thêm kiểm tra "chỉ nghệ nhân đã xác thực".
    function createListing(uint256 price, ProductType pType, string calldata metadataURI)
        external
        returns (uint256 listingId)
    {
        if (price == 0) revert ZeroPrice();
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();

        listingId = nextListingId++;
        _listings[listingId] = Listing({
            id: listingId,
            seller: msg.sender,
            price: price,
            pType: pType,
            metadataURI: metadataURI,
            isActive: true
        });

        emit ListingCreated(listingId, msg.sender, price, pType, metadataURI);
    }

    /// @notice Mua listing. Gửi >= price; phần dư được hoàn lại cho buyer.
    function purchaseListing(uint256 listingId) external payable nonReentrant {
        Listing storage listing = _listings[listingId];

        if (listing.seller == address(0)) revert ListingNotFound(listingId);
        if (!listing.isActive) revert ListingNotActive(listingId);

        uint256 price = listing.price;
        if (msg.value < price) revert InsufficientPayment(price, msg.value);

        // Effects trước interactions
        listing.isActive = false;
        address seller = listing.seller;
        ProductType pType = listing.pType;

        // Interactions
        paymentSplitter.splitPayment{value: price}(seller, pType);
        impactBadge.mint(msg.sender, pType);

        emit ListingPurchased(listingId, msg.sender, seller, price);

        uint256 excess = msg.value - price;
        if (excess > 0) {
            (bool ok,) = msg.sender.call{value: excess}("");
            if (!ok) revert RefundFailed();
        }
    }

    /// @notice Huỷ listing. Chỉ seller hoặc owner của contract.
    function cancelListing(uint256 listingId) external {
        Listing storage listing = _listings[listingId];

        if (listing.seller == address(0)) revert ListingNotFound(listingId);
        if (msg.sender != listing.seller && msg.sender != owner()) revert NotSellerOrOwner(msg.sender);
        if (!listing.isActive) revert ListingNotActive(listingId);

        listing.isActive = false;
        emit ListingCancelled(listingId, msg.sender);
    }

    // ───────────────────────────── Views ─────────────────────────────

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    /// @notice Cho phép Admin cập nhật địa chỉ PaymentSplitter mới khi cần nâng cấp
    function setPaymentSplitter(address newSplitter) external onlyOwner {
        if (newSplitter == address(0)) revert ZeroAddress();
        paymentSplitter = IPaymentSplitter(newSplitter);
    }

    /// @notice Cho phép Admin cập nhật địa chỉ ImpactBadge mới khi cần nâng cấp
    function setImpactBadge(address newBadge) external onlyOwner {
        if (newBadge == address(0)) revert ZeroAddress();
        impactBadge = IImpactBadge(newBadge);
    }
}
