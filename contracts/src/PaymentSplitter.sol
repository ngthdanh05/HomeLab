// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ProductType, IPaymentSplitter} from "./interfaces/IMarketPlaceDeps.sol";

/// @notice CommunityTreasury functions used here.
interface ICommunityTreasury {
    function deposit() external payable;
}

/// @notice EcoToken functions used here.
/// @dev Needs MINTER_ROLE on EcoToken.
interface IEcoToken {
    function mint(address to, uint256 amount) external;
}

/// @title PaymentSplitter
/// @notice Splits D2C revenue between artisan, treasury and platform, and rewards buyers in ECO.
contract PaymentSplitter is Ownable2Step, ReentrancyGuard, IPaymentSplitter {
    // --- Errors ---
    error InvalidBPS();
    error ShareLimitExceeded();
    error NotMarketplace();
    error ZeroAddress();
    error ZeroPayment();
    error TransferFailed();
    error NothingToWithdraw();

    // --- Events ---
    event PaymentSplit(address indexed artisan, uint256 artisanAmt, uint256 treasuryAmt, uint256 platformAmt);
    event SharesUpdated(uint16 artisanBPS, uint16 treasuryBPS, uint16 platformBPS);
    event EcoRewardRateUpdated(uint256 newRate);
    event EcoRewarded(address indexed visitor, uint256 amount);
    event PlatformFeesWithdrawn(address indexed to, uint256 amount);
    event MarketplaceUpdated(address indexed marketplace);

    // --- State ---
    uint256 public constant BPS_DENOMINATOR = 10_000;
    /// @notice Artisan share floor (50%).
    uint16 public constant MIN_ARTISAN_BPS = 5_000;
    /// @notice Platform share cap (20%).
    uint16 public constant MAX_PLATFORM_BPS = 2_000;

    ICommunityTreasury public immutable treasury;
    IEcoToken public immutable ecoToken;

    uint16 public artisanBPS;
    uint16 public treasuryBPS;
    uint16 public platformBPS;

    /// @notice ECO (in wei) rewarded per 1 ether paid.
    uint256 public ecoRewardRate;

    /// @notice Accrued platform fees awaiting withdrawal.
    uint256 public pendingPlatformFees;

    /// @notice Only caller allowed to split with an ECO reward.
    address public marketplace;

    // --- Constructor ---
    constructor(
        address treasury_,
        address ecoToken_,
        uint16 artisanBPS_,
        uint16 treasuryBPS_,
        uint16 platformBPS_,
        uint256 ecoRewardRate_
    ) Ownable(msg.sender) {
        if (treasury_ == address(0) || ecoToken_ == address(0)) revert ZeroAddress();
        treasury = ICommunityTreasury(treasury_);
        ecoToken = IEcoToken(ecoToken_);

        _setShares(artisanBPS_, treasuryBPS_, platformBPS_);

        ecoRewardRate = ecoRewardRate_;
        emit EcoRewardRateUpdated(ecoRewardRate_);
    }

    // --- Core ---

    /// @notice Splits a Marketplace payment and rewards `buyer`.
    /// @dev Marketplace only: ECO is voting power, so it must come from a verified artisan's listing.
    function splitPayment(address seller, address buyer, ProductType /* pType */)
        external
        payable
        override
        nonReentrant
    {
        if (msg.sender != marketplace) revert NotMarketplace();
        if (buyer == address(0)) revert ZeroAddress();
        _splitPayment(seller, buyer);
    }

    /// @notice Direct payment to an artisan, without an ECO reward.
    function splitPayment(address artisan) external payable nonReentrant {
        _splitPayment(artisan, address(0));
    }

    /// @param rewardRecipient ECO recipient; address(0) means no reward.
    function _splitPayment(address artisan, address rewardRecipient) internal {
        if (artisan == address(0)) revert ZeroAddress();
        if (msg.value == 0) revert ZeroPayment();

        // --- Checks / Effects ---
        uint256 artisanAmt = (msg.value * artisanBPS) / BPS_DENOMINATOR;
        uint256 treasuryAmt = (msg.value * treasuryBPS) / BPS_DENOMINATOR;
        uint256 platformAmt = msg.value - artisanAmt - treasuryAmt; // includes rounding dust

        pendingPlatformFees += platformAmt;

        // --- Interactions ---
        if (artisanAmt > 0) {
            (bool ok,) = artisan.call{value: artisanAmt}("");
            if (!ok) revert TransferFailed();
        }

        if (treasuryAmt > 0) {
            treasury.deposit{value: treasuryAmt}();
        }

        uint256 reward = rewardRecipient == address(0) ? 0 : (msg.value * ecoRewardRate) / 1 ether;
        if (reward > 0) {
            ecoToken.mint(rewardRecipient, reward);
            emit EcoRewarded(rewardRecipient, reward);
        }

        emit PaymentSplit(artisan, artisanAmt, treasuryAmt, platformAmt);
    }

    /// @notice Withdraws all accrued platform fees.
    function withdrawPlatformFees(address payable to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();

        uint256 amount = pendingPlatformFees;
        if (amount == 0) revert NothingToWithdraw();

        pendingPlatformFees = 0; // effect before interaction

        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit PlatformFeesWithdrawn(to, amount);
    }

    // --- Admin ---

    /// @notice Sets the Marketplace allowed to split with a reward.
    function setMarketplace(address marketplace_) external onlyOwner {
        if (marketplace_ == address(0)) revert ZeroAddress();
        marketplace = marketplace_;
        emit MarketplaceUpdated(marketplace_);
    }

    /// @notice Updates the split. Must total 10_000 and respect the share limits.
    function setShares(uint16 artisanBPS_, uint16 treasuryBPS_, uint16 platformBPS_) external onlyOwner {
        _setShares(artisanBPS_, treasuryBPS_, platformBPS_);
    }

    /// @notice Updates the ECO reward per 1 ether (0 disables it).
    function setEcoRewardRate(uint256 newRate) external onlyOwner {
        ecoRewardRate = newRate;
        emit EcoRewardRateUpdated(newRate);
    }

    // --- Internal ---
    function _setShares(uint16 a, uint16 t, uint16 p) internal {
        if (uint256(a) + uint256(t) + uint256(p) != BPS_DENOMINATOR) revert InvalidBPS();
        if (a < MIN_ARTISAN_BPS || p > MAX_PLATFORM_BPS) revert ShareLimitExceeded();
        artisanBPS = a;
        treasuryBPS = t;
        platformBPS = p;
        emit SharesUpdated(a, t, p);
    }
}
