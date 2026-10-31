// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ProductType, IPaymentSplitter} from "./interfaces/IMarketPlaceDeps.sol";

/// @notice Giao diện tối thiểu của CommunityTreasury mà PaymentSplitter cần.
interface ICommunityTreasury {
    function deposit() external payable;
}

/// @notice Giao diện tối thiểu của EcoToken mà PaymentSplitter cần.
/// @dev PaymentSplitter phải được cấp quyền mint (MINTER_ROLE / owner) trên EcoToken.
interface IEcoToken {
    function mint(address to, uint256 amount) external;
}

/// @title PaymentSplitter
/// @notice Tự động phân tách doanh thu D2C giữa nghệ nhân, quỹ cộng đồng và nền tảng,
///         đồng thời thưởng EcoToken cho du khách.
contract PaymentSplitter is Ownable, ReentrancyGuard, IPaymentSplitter {
    // ------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------
    error InvalidBPS();
    error ZeroAddress();
    error ZeroPayment();
    error TransferFailed();
    error NothingToWithdraw();

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------
    event PaymentSplit(address indexed artisan, uint256 artisanAmt, uint256 treasuryAmt, uint256 platformAmt);
    event SharesUpdated(uint16 artisanBPS, uint16 treasuryBPS, uint16 platformBPS);
    event EcoRewardRateUpdated(uint256 newRate);
    event EcoRewarded(address indexed visitor, uint256 amount);
    event PlatformFeesWithdrawn(address indexed to, uint256 amount);

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------
    uint256 public constant BPS_DENOMINATOR = 10_000;

    ICommunityTreasury public immutable treasury;
    IEcoToken public immutable ecoToken;

    uint16 public artisanBPS;
    uint16 public treasuryBPS;
    uint16 public platformBPS;

    /// @notice Số EcoToken (đơn vị wei của token) thưởng cho mỗi 1 ether thanh toán.
    uint256 public ecoRewardRate;

    /// @notice Phí platform đã tích luỹ, chờ owner rút (pull pattern).
    uint256 public pendingPlatformFees;

    // ------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------
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

    // ------------------------------------------------------------------
    // Core
    // ------------------------------------------------------------------

    /// @notice Phân tách thanh toán khi được gọi bởi Marketplace (theo IPaymentSplitter).
    function splitPayment(address seller, ProductType /* pType */) external payable override nonReentrant {
        _splitPayment(seller);
    }

    /// @notice Phân tách thanh toán với 1 tham số artisan.
    function splitPayment(address artisan) external payable nonReentrant {
        _splitPayment(artisan);
    }

    function _splitPayment(address artisan) internal {
        if (artisan == address(0)) revert ZeroAddress();
        if (msg.value == 0) revert ZeroPayment();

        // --- Checks / Effects: tính toán và ghi sổ trước mọi external call ---
        uint256 artisanAmt = (msg.value * artisanBPS) / BPS_DENOMINATOR;
        uint256 treasuryAmt = (msg.value * treasuryBPS) / BPS_DENOMINATOR;
        uint256 platformAmt = msg.value - artisanAmt - treasuryAmt; // gồm cả phần dư làm tròn

        pendingPlatformFees += platformAmt;

        // --- Interactions ---
        if (artisanAmt > 0) {
            (bool ok,) = artisan.call{value: artisanAmt}("");
            if (!ok) revert TransferFailed();
        }

        if (treasuryAmt > 0) {
            treasury.deposit{value: treasuryAmt}();
        }

        uint256 reward = (msg.value * ecoRewardRate) / 1 ether;
        if (reward > 0) {
            ecoToken.mint(msg.sender, reward);
            emit EcoRewarded(msg.sender, reward);
        }

        emit PaymentSplit(artisan, artisanAmt, treasuryAmt, platformAmt);
    }

    /// @notice Owner rút toàn bộ phí platform đã tích luỹ.
    function withdrawPlatformFees(address payable to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();

        uint256 amount = pendingPlatformFees;
        if (amount == 0) revert NothingToWithdraw();

        pendingPlatformFees = 0; // effect trước interaction

        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit PlatformFeesWithdrawn(to, amount);
    }

    // ------------------------------------------------------------------
    // Admin
    // ------------------------------------------------------------------

    /// @notice Cập nhật tỷ lệ chia. Revert nếu tổng khác 10_000.
    function setShares(uint16 artisanBPS_, uint16 treasuryBPS_, uint16 platformBPS_) external onlyOwner {
        _setShares(artisanBPS_, treasuryBPS_, platformBPS_);
    }

    /// @notice Cập nhật mức thưởng EcoToken trên mỗi 1 ether thanh toán (0 = tắt thưởng).
    function setEcoRewardRate(uint256 newRate) external onlyOwner {
        ecoRewardRate = newRate;
        emit EcoRewardRateUpdated(newRate);
    }

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------
    function _setShares(uint16 a, uint16 t, uint16 p) internal {
        if (uint256(a) + uint256(t) + uint256(p) != BPS_DENOMINATOR) revert InvalidBPS();
        artisanBPS = a;
        treasuryBPS = t;
        platformBPS = p;
        emit SharesUpdated(a, t, p);
    }
}
