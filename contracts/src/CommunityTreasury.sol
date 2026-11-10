// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CommunityTreasury
/// @notice Holds community ETH; only Governance can disburse.
contract CommunityTreasury is Ownable2Step, ReentrancyGuard {
    struct Disbursement {
        uint256 proposalId;
        address recipient;
        uint256 amount;
        uint256 timestamp;
    }

    /// @notice Sole caller of `disburse()`. Set once.
    address public governance;

    /// @notice Disbursement history.
    Disbursement[] public disbursements;

    /// @notice Total ETH received through deposit()/receive().
    uint256 public totalDeposited;
    /// @notice Total ETH disbursed.
    uint256 public totalDisbursed;

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

    /// @notice Sets Governance once, breaking the deploy-time circular dependency.
    function setGovernance(address governance_) external onlyOwner {
        if (governance != address(0)) revert GovernanceAlreadySet();
        if (governance_ == address(0)) revert ZeroAddress();
        governance = governance_;
        emit GovernanceSet(governance_);
    }

    /// @notice Accepts ETH from anyone.
    receive() external payable {
        totalDeposited += msg.value;
        emit FundsReceived(msg.sender, msg.value);
    }

    /// @notice Accepts ETH from PaymentSplitter and CarbonOffset.
    function deposit() external payable {
        totalDeposited += msg.value;
        emit FundsReceived(msg.sender, msg.value);
    }

    /// @notice Pays `recipient`. Governance only.
    function disburse(uint256 proposalId, address payable recipient, uint256 amount) external nonReentrant {
        if (msg.sender != governance) revert NotGovernance();
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        uint256 bal = address(this).balance;
        if (amount > bal) revert InsufficientBalance(bal, amount);

        totalDisbursed += amount;
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
