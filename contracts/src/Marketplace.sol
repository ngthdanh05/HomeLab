// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ProductType, IPaymentSplitter, IImpactBadge} from "./interfaces/IMarketPlaceDeps.sol";

/// @title Marketplace
/// @notice D2C marketplace with escrow: funds are split and rewards issued only on release.
/// @dev A listing sells once, so an order shares its listing id.
contract Marketplace is Ownable2Step, ReentrancyGuard, Pausable {
    // ───────────────────────────── Types ─────────────────────────────

    struct Listing {
        uint256 id;
        address seller;
        uint256 price;
        ProductType pType;
        string metadataURI;
        bool isActive;
    }

    enum OrderStatus {
        None,
        Paid,
        Disputed,
        Released,
        Refunded
    }

    struct Order {
        address buyer;
        uint64 paidAt;
        uint64 disputedAt;
        OrderStatus status;
        uint256 price;
    }

    // ───────────────────────────── Storage ───────────────────────────

    uint256 public constant MIN_ESCROW_PERIOD = 1 days;
    uint256 public constant MAX_ESCROW_PERIOD = 60 days;
    /// @notice After this period an unresolved dispute can be refunded.
    uint256 public constant STALE_DISPUTE_PERIOD = 60 days;

    IPaymentSplitter public paymentSplitter;
    IImpactBadge public impactBadge;

    /// @dev Ids start at 1; 0 means not found.
    uint256 public nextListingId = 1;

    mapping(uint256 => Listing) private _listings;
    mapping(uint256 listingId => Order) private _orders;

    /// @notice After this period anyone can release the funds to the artisan.
    uint256 public escrowPeriod = 14 days;

    /// @notice Resolves disputes (defaults to owner).
    address public arbiter;

    /// @notice Minimum listing price, against dust-priced rewards.
    uint256 public minListingPrice = 0.001 ether;

    /// @notice When on, only verified artisans can list.
    bool public artisanVerificationRequired = true;

    /// @notice Artisans verified by the owner.
    mapping(address artisan => bool) public verifiedArtisan;

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
    event OrderReleased(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 price);
    event OrderRefunded(uint256 indexed listingId, address indexed buyer, uint256 price);
    event OrderDisputed(uint256 indexed listingId, address indexed buyer);
    event BadgeMintFailed(uint256 indexed listingId, address indexed buyer);
    event EscrowPeriodUpdated(uint256 newPeriod);
    event ArbiterUpdated(address indexed newArbiter);
    event ArtisanVerificationSet(address indexed artisan, bool verified);
    event ArtisanVerificationRequiredSet(bool required);
    event MinListingPriceUpdated(uint256 newPrice);
    event PaymentSplitterUpdated(address indexed newSplitter);
    event ImpactBadgeUpdated(address indexed newBadge);

    // ───────────────────────────── Errors ────────────────────────────

    error ZeroAddress();
    error ZeroPrice();
    error PriceBelowMinimum(uint256 price, uint256 minimum);
    error ArtisanNotVerified(address seller);
    error SelfPurchase();
    error EmptyMetadataURI();
    error ListingNotFound(uint256 listingId);
    error ListingNotActive(uint256 listingId);
    error InsufficientPayment(uint256 required, uint256 sent);
    error NotSellerOrOwner(address caller);
    error RefundFailed();
    error InvalidOrderStatus(uint256 listingId);
    error NotBuyer();
    error NotSeller();
    error NotArbiter();
    error EscrowNotExpired(uint256 releasableAt);
    error DisputeNotStale(uint256 claimableAt);
    error InvalidEscrowPeriod();

    // ───────────────────────────── Constructor ───────────────────────

    constructor(address splitter, address badge, address initialOwner) Ownable(initialOwner) {
        if (splitter == address(0) || badge == address(0)) revert ZeroAddress();
        paymentSplitter = IPaymentSplitter(splitter);
        impactBadge = IImpactBadge(badge);
        arbiter = initialOwner;
    }

    // ───────────────────────────── External ──────────────────────────

    /// @notice Creates a listing with msg.sender as seller.
    function createListing(uint256 price, ProductType pType, string calldata metadataURI)
        external
        whenNotPaused
        returns (uint256 listingId)
    {
        if (artisanVerificationRequired && !verifiedArtisan[msg.sender]) revert ArtisanNotVerified(msg.sender);
        if (price == 0) revert ZeroPrice();
        if (price < minListingPrice) revert PriceBelowMinimum(price, minListingPrice);
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

    /// @notice Buys a listing into escrow; excess ETH is refunded.
    function purchaseListing(uint256 listingId) external payable nonReentrant whenNotPaused {
        Listing storage listing = _listings[listingId];

        if (listing.seller == address(0)) revert ListingNotFound(listingId);
        if (!listing.isActive) revert ListingNotActive(listingId);
        if (msg.sender == listing.seller) revert SelfPurchase();

        uint256 price = listing.price;
        if (msg.value < price) revert InsufficientPayment(price, msg.value);

        // Effects before interactions
        listing.isActive = false;
        _orders[listingId] = Order({
            buyer: msg.sender,
            paidAt: uint64(block.timestamp),
            disputedAt: 0,
            status: OrderStatus.Paid,
            price: price
        });

        emit ListingPurchased(listingId, msg.sender, listing.seller, price);

        uint256 excess = msg.value - price;
        if (excess > 0) {
            (bool ok,) = msg.sender.call{value: excess}("");
            if (!ok) revert RefundFailed();
        }
    }

    /// @notice Buyer confirms delivery, releasing the funds.
    function confirmDelivery(uint256 listingId) external nonReentrant {
        Order storage order = _orders[listingId];
        if (order.status != OrderStatus.Paid) revert InvalidOrderStatus(listingId);
        if (msg.sender != order.buyer) revert NotBuyer();
        _release(listingId, order);
    }

    /// @notice Anyone can release once the escrow period has passed.
    function releaseAfterTimeout(uint256 listingId) external nonReentrant {
        Order storage order = _orders[listingId];
        if (order.status != OrderStatus.Paid) revert InvalidOrderStatus(listingId);
        uint256 releasableAt = order.paidAt + escrowPeriod;
        if (block.timestamp < releasableAt) revert EscrowNotExpired(releasableAt);
        _release(listingId, order);
    }

    /// @notice Seller refunds the buyer, even during a dispute.
    function refundBuyer(uint256 listingId) external nonReentrant {
        Order storage order = _orders[listingId];
        if (order.status != OrderStatus.Paid && order.status != OrderStatus.Disputed) {
            revert InvalidOrderStatus(listingId);
        }
        if (msg.sender != _listings[listingId].seller) revert NotSeller();
        _refund(listingId, order);
    }

    /// @notice Buyer disputes an unreleased order, holding the funds until resolved.
    function openDispute(uint256 listingId) external {
        Order storage order = _orders[listingId];
        if (order.status != OrderStatus.Paid) revert InvalidOrderStatus(listingId);
        if (msg.sender != order.buyer) revert NotBuyer();
        order.status = OrderStatus.Disputed;
        order.disputedAt = uint64(block.timestamp);
        emit OrderDisputed(listingId, msg.sender);
    }

    /// @notice Arbiter refunds the buyer or releases to the artisan.
    function resolveDispute(uint256 listingId, bool refundToBuyer) external nonReentrant {
        Order storage order = _orders[listingId];
        if (msg.sender != arbiter) revert NotArbiter();
        if (order.status != OrderStatus.Disputed) revert InvalidOrderStatus(listingId);
        if (refundToBuyer) {
            _refund(listingId, order);
        } else {
            _release(listingId, order);
        }
    }

    /// @notice Refunds a dispute nobody resolved, so ETH cannot be locked forever.
    function refundStaleDispute(uint256 listingId) external nonReentrant {
        Order storage order = _orders[listingId];
        if (order.status != OrderStatus.Disputed) revert InvalidOrderStatus(listingId);
        uint256 claimableAt = order.disputedAt + STALE_DISPUTE_PERIOD;
        if (block.timestamp < claimableAt) revert DisputeNotStale(claimableAt);
        _refund(listingId, order);
    }

    /// @notice Cancels a listing. Seller or owner only.
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

    function getOrder(uint256 listingId) external view returns (Order memory) {
        return _orders[listingId];
    }

    // ───────────────────────────── Internal ──────────────────────────

    /// @dev ECO and badge are issued only here, so buy-then-refund earns nothing.
    function _release(uint256 listingId, Order storage order) internal {
        Listing storage listing = _listings[listingId];
        address buyer = order.buyer;
        address seller = listing.seller;
        uint256 price = order.price;
        ProductType pType = listing.pType;

        order.status = OrderStatus.Released;

        paymentSplitter.splitPayment{value: price}(seller, buyer, pType);
        // A buyer contract rejecting the NFT must not block the artisan's payment.
        try impactBadge.mint(buyer, pType) returns (uint256) {} catch {
            emit BadgeMintFailed(listingId, buyer);
        }

        emit OrderReleased(listingId, buyer, seller, price);
    }

    function _refund(uint256 listingId, Order storage order) internal {
        address buyer = order.buyer;
        uint256 price = order.price;

        order.status = OrderStatus.Refunded;

        (bool ok,) = buyer.call{value: price}("");
        if (!ok) revert RefundFailed();

        emit OrderRefunded(listingId, buyer, price);
    }

    // ───────────────────────────── Admin ─────────────────────────────

    /// @notice Verifies or unverifies an artisan.
    function setArtisanVerified(address artisan, bool verified) external onlyOwner {
        if (artisan == address(0)) revert ZeroAddress();
        verifiedArtisan[artisan] = verified;
        emit ArtisanVerificationSet(artisan, verified);
    }

    /// @notice Toggles artisan verification (only disable locally).
    function setArtisanVerificationRequired(bool required) external onlyOwner {
        artisanVerificationRequired = required;
        emit ArtisanVerificationRequiredSet(required);
    }

    function setEscrowPeriod(uint256 newPeriod) external onlyOwner {
        if (newPeriod < MIN_ESCROW_PERIOD || newPeriod > MAX_ESCROW_PERIOD) revert InvalidEscrowPeriod();
        escrowPeriod = newPeriod;
        emit EscrowPeriodUpdated(newPeriod);
    }

    function setArbiter(address newArbiter) external onlyOwner {
        if (newArbiter == address(0)) revert ZeroAddress();
        arbiter = newArbiter;
        emit ArbiterUpdated(newArbiter);
    }

    function setMinListingPrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0) revert ZeroPrice();
        minListingPrice = newPrice;
        emit MinListingPriceUpdated(newPrice);
    }

    /// @notice Emergency stop for listing and buying; cancels and escrow exits still work.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Replaces PaymentSplitter.
    function setPaymentSplitter(address newSplitter) external onlyOwner {
        if (newSplitter == address(0)) revert ZeroAddress();
        paymentSplitter = IPaymentSplitter(newSplitter);
        emit PaymentSplitterUpdated(newSplitter);
    }

    /// @notice Replaces ImpactBadge.
    function setImpactBadge(address newBadge) external onlyOwner {
        if (newBadge == address(0)) revert ZeroAddress();
        impactBadge = IImpactBadge(newBadge);
        emit ImpactBadgeUpdated(newBadge);
    }
}
