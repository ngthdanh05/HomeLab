// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CommunityTreasury
/// @notice Quỹ cộng đồng: nhận ETH (từ PaymentSplitter) và chỉ giải ngân khi Governance yêu cầu.
contract CommunityTreasury is Ownable, ReentrancyGuard {
    struct Disbursement {
        uint256 proposalId;
        address recipient;
        uint256 amount;
        uint256 timestamp;
    }

    /// @notice Địa chỉ Governance duy nhất được phép gọi `disburse()`. Chỉ set được 1 lần.
    address public governance;

    /// @notice Lịch sử giải ngân.
    Disbursement[] public disbursements;

    error NotGovernance();
    error GovernanceAlreadySet();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance(uint256 available, uint256 requested);
    error TransferFailed();

    event FundsReceived(address indexed from, uint256 amount);
    event GovernanceSet(address indexed governance);
    event Disbursed(uint256 indexed proposalId, address indexed recipient, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Set Governance (một lần duy nhất) — giải quyết phụ thuộc vòng khi deploy.
    function setGovernance(address governance_) external onlyOwner {
        if (governance != address(0)) revert GovernanceAlreadySet();
        if (governance_ == address(0)) revert ZeroAddress();
        governance = governance_;
        emit GovernanceSet(governance_);
    }

    /// @notice Nhận ETH (từ PaymentSplitter hoặc bất kỳ ai).
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    /// @notice Giải ngân ETH cho recipient. Chỉ Governance được gọi.
    function disburse(uint256 proposalId, address payable recipient, uint256 amount) external nonReentrant {
        if (msg.sender != governance) revert NotGovernance();
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        uint256 bal = address(this).balance;
        if (amount > bal) revert InsufficientBalance(bal, amount);

        disbursements.push(
            Disbursement({proposalId: proposalId, recipient: recipient, amount: amount, timestamp: block.timestamp})
        );

        (bool ok,) = recipient.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Disbursed(proposalId, recipient, amount);
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    function disbursementsLength() external view returns (uint256) {
        return disbursements.length;
    }
}
