// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ImpactBadge} from "./ImpactBadge.sol";

interface ITreasuryDeposit {
    function deposit() external payable;
}

/// @title CarbonOffset
/// @notice Du khách tự bù đắp phát thải CO₂ của chuyến đi: trả phí theo kg CO₂,
///         toàn bộ phí vào CommunityTreasury (quỹ bảo tồn do DAO quản lý) và nhận
///         NFT ImpactBadge loại ZERO_CARBON làm bằng chứng (Proof of Action).
/// @dev Contract này cần MINTER_ROLE trên ImpactBadge. Lượng phát thải tính bằng gram
///      để giữ được phần lẻ (vd 12.5 kg = 12_500 g).
contract CarbonOffset is Ownable, ReentrancyGuard {
    ImpactBadge public immutable impactBadge;
    ITreasuryDeposit public immutable treasury;

    /// @notice Giá bù đắp cho 1 kg CO₂ (wei).
    uint256 public pricePerKgWei;

    /// @notice Giới hạn một lần offset: 100 tấn CO₂.
    uint256 public constant MAX_OFFSET_GRAMS = 100_000_000;
    /// @notice Metadata (thường là data: URI JSON) tối đa 2 KB để hạn chế gas/spam.
    uint256 public constant MAX_METADATA_URI_LENGTH = 2048;

    /// @notice Tổng gram CO₂ mỗi ví đã bù đắp.
    mapping(address => uint256) public offsetGramsOf;
    /// @notice Số lần bù đắp (cũng là số badge ZERO_CARBON nhận qua contract này) của mỗi ví.
    mapping(address => uint256) public offsetCountOf;
    /// @notice Tổng gram CO₂ đã bù đắp trên toàn nền tảng.
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

    /// @notice Phí (wei) để bù đắp `carbonGrams` gram CO₂, làm tròn lên.
    function quoteOffset(uint256 carbonGrams) public view returns (uint256) {
        return (carbonGrams * pricePerKgWei + 999) / 1000;
    }

    /// @notice Bù đắp `carbonGrams` gram CO₂ và nhận badge ZERO_CARBON.
    /// @param metadataURI Metadata của badge; để trống sẽ dùng metadata mặc định của ImpactBadge.
    /// @return tokenId Badge vừa mint. ETH gửi thừa được hoàn lại.
    function offset(uint256 carbonGrams, string calldata metadataURI)
        external
        payable
        nonReentrant
        returns (uint256 tokenId)
    {
        if (carbonGrams == 0 || carbonGrams > MAX_OFFSET_GRAMS) revert InvalidCarbonAmount();
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

    function setPricePerKg(uint256 newPrice) external onlyOwner {
        pricePerKgWei = newPrice;
        emit PricePerKgUpdated(newPrice);
    }
}
