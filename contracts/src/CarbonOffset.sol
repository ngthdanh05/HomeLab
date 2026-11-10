// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ImpactBadge} from "./ImpactBadge.sol";

interface ITreasuryDeposit {
    function deposit() external payable;
}

/// @title CarbonOffset
/// @notice Pays a CO2 offset fee into CommunityTreasury and mints a ZERO_CARBON ImpactBadge.
/// @dev Needs MINTER_ROLE on ImpactBadge. Amounts are in grams.
contract CarbonOffset is Ownable2Step, ReentrancyGuard, Pausable {
    ImpactBadge public immutable impactBadge;
    ITreasuryDeposit public immutable treasury;

    /// @notice Price per kg of CO2, in wei.
    uint256 public pricePerKgWei;

    /// @notice Minimum per offset: 1 kg CO2.
    uint256 public constant MIN_OFFSET_GRAMS = 1_000;
    /// @notice Maximum per offset: 100 t CO2.
    uint256 public constant MAX_OFFSET_GRAMS = 100_000_000;
    /// @notice Metadata limit (2 KB) against gas spam.
    uint256 public constant MAX_METADATA_URI_LENGTH = 2048;

    /// @notice Total grams offset per wallet.
    mapping(address => uint256) public offsetGramsOf;
    /// @notice Number of offsets per wallet.
    mapping(address => uint256) public offsetCountOf;
    /// @notice Total grams offset on the platform.
    uint256 public totalOffsetGrams;

    event CarbonOffsetted(address indexed user, uint256 indexed tokenId, uint256 carbonGrams, uint256 paid);
    event PricePerKgUpdated(uint256 newPrice);

    error ZeroAddress();
    error InvalidCarbonAmount();
    error MetadataTooLong();
    error InsufficientPayment(uint256 required, uint256 sent);
    error RefundFailed();

    constructor(address impactBadge_, address treasury_, uint256 pricePerKgWei_, address initialOwner)
        Ownable(initialOwner)
    {
        if (impactBadge_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        impactBadge = ImpactBadge(impactBadge_);
        treasury = ITreasuryDeposit(treasury_);
        pricePerKgWei = pricePerKgWei_;
        emit PricePerKgUpdated(pricePerKgWei_);
    }

    /// @notice Fee in wei for `carbonGrams`, rounded up.
    function quoteOffset(uint256 carbonGrams) public view returns (uint256) {
        return (carbonGrams * pricePerKgWei + 999) / 1000;
    }

    /// @notice Offsets `carbonGrams` and mints a ZERO_CARBON badge; excess ETH is refunded.
    /// @param metadataURI Badge metadata; empty uses the ImpactBadge default.
    /// @return tokenId The minted badge.
    function offset(uint256 carbonGrams, string calldata metadataURI)
        external
        payable
        nonReentrant
        whenNotPaused
        returns (uint256 tokenId)
    {
        if (carbonGrams < MIN_OFFSET_GRAMS || carbonGrams > MAX_OFFSET_GRAMS) revert InvalidCarbonAmount();
        if (bytes(metadataURI).length > MAX_METADATA_URI_LENGTH) revert MetadataTooLong();

        uint256 required = quoteOffset(carbonGrams);
        if (msg.value < required) revert InsufficientPayment(required, msg.value);

        // Effects
        offsetGramsOf[msg.sender] += carbonGrams;
        offsetCountOf[msg.sender] += 1;
        totalOffsetGrams += carbonGrams;

        // Interactions
        if (required > 0) treasury.deposit{value: required}();

        tokenId = impactBadge.mintBadge(
            msg.sender,
            ImpactBadge.BadgeType.ZERO_CARBON,
            bytes(metadataURI).length == 0 ? impactBadge.DEFAULT_METADATA_URI() : metadataURI
        );

        uint256 refund = msg.value - required;
        if (refund > 0) {
            (bool ok,) = msg.sender.call{value: refund}("");
            if (!ok) revert RefundFailed();
        }

        emit CarbonOffsetted(msg.sender, tokenId, carbonGrams, required);
    }

    /// @notice Emergency stop for new offsets.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setPricePerKg(uint256 newPrice) external onlyOwner {
        pricePerKgWei = newPrice;
        emit PricePerKgUpdated(newPrice);
    }
}
