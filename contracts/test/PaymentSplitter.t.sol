// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PaymentSplitter} from "../src/PaymentSplitter.sol";

// ----------------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------------

contract MockTreasury {
    uint256 public totalDeposited;

    function deposit() external payable {
        totalDeposited += msg.value;
    }
}

contract MockEcoToken {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
}

/// @dev Nghệ nhân độc hại: khi nhận ETH sẽ cố gọi lại splitPayment.
contract ReentrantArtisan {
    PaymentSplitter public immutable splitter;
    bool public immutable swallow; // true: nuốt lỗi reentrancy để giao dịch ngoài vẫn thành công
    bool public reentered;
    bytes public lastReason;

    constructor(PaymentSplitter splitter_, bool swallow_) {
        splitter = splitter_;
        swallow = swallow_;
    }

    function attack() external payable {
        splitter.splitPayment{value: msg.value}(address(this));
    }

    receive() external payable {
        try splitter.splitPayment{value: address(this).balance}(address(this)) {
            reentered = true;
        } catch (bytes memory reason) {
            lastReason = reason;
            if (!swallow) revert("reentrancy attempted");
        }
    }
}

/// @dev Contract không có receive/fallback => từ chối ETH.
contract RejectETH {}

// ----------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------

contract PaymentSplitterTest is Test {
    event PaymentSplit(address indexed artisan, uint256 artisanAmt, uint256 treasuryAmt, uint256 platformAmt);
    event SharesUpdated(uint16 artisanBPS, uint16 treasuryBPS, uint16 platformBPS);
    event EcoRewardRateUpdated(uint256 newRate);
    event EcoRewarded(address indexed visitor, uint256 amount);
    event PlatformFeesWithdrawn(address indexed to, uint256 amount);

    PaymentSplitter internal splitter;
    MockTreasury internal treasury;
    MockEcoToken internal eco;

    address internal owner = makeAddr("owner");
    address internal artisan = makeAddr("artisan");
    address internal visitor = makeAddr("visitor");
    address internal stranger = makeAddr("stranger");

    uint16 internal constant ARTISAN_BPS = 7000; // 70%
    uint16 internal constant TREASURY_BPS = 2000; // 20%
    uint16 internal constant PLATFORM_BPS = 1000; // 10%
    uint256 internal constant REWARD_RATE = 100 ether; // 100 ECO / 1 ETH

    function setUp() public {
        treasury = new MockTreasury();
        eco = new MockEcoToken();

        vm.prank(owner);
        splitter = new PaymentSplitter(
            address(treasury), address(eco), ARTISAN_BPS, TREASURY_BPS, PLATFORM_BPS, REWARD_RATE
        );

        vm.deal(visitor, 1000 ether);
    }

    // ------------------------------ constructor ------------------------------

    function test_Constructor_SetsState() public view {
        assertEq(address(splitter.treasury()), address(treasury));
        assertEq(address(splitter.ecoToken()), address(eco));
        assertEq(splitter.artisanBPS(), ARTISAN_BPS);
        assertEq(splitter.treasuryBPS(), TREASURY_BPS);
        assertEq(splitter.platformBPS(), PLATFORM_BPS);
        assertEq(splitter.ecoRewardRate(), REWARD_RATE);
        assertEq(splitter.owner(), owner);
        assertEq(uint256(splitter.artisanBPS()) + splitter.treasuryBPS() + splitter.platformBPS(), 10_000);
    }

    function test_Constructor_RevertsOnInvalidBPS() public {
        vm.expectRevert(PaymentSplitter.InvalidBPS.selector);
        new PaymentSplitter(address(treasury), address(eco), 5000, 3000, 1000, 0);
    }

    function test_Constructor_RevertsOnZeroTreasury() public {
        vm.expectRevert(PaymentSplitter.ZeroAddress.selector);
        new PaymentSplitter(address(0), address(eco), ARTISAN_BPS, TREASURY_BPS, PLATFORM_BPS, 0);
    }

    function test_Constructor_RevertsOnZeroEcoToken() public {
        vm.expectRevert(PaymentSplitter.ZeroAddress.selector);
        new PaymentSplitter(address(treasury), address(0), ARTISAN_BPS, TREASURY_BPS, PLATFORM_BPS, 0);
    }

    // ------------------------------ BPS config ------------------------------

    function test_SetShares_UpdatesWhenSumIs10000() public {
        vm.expectEmit(address(splitter));
        emit SharesUpdated(5000, 3000, 2000);

        vm.prank(owner);
        splitter.setShares(5000, 3000, 2000);

        assertEq(splitter.artisanBPS(), 5000);
        assertEq(splitter.treasuryBPS(), 3000);
        assertEq(splitter.platformBPS(), 2000);
    }

    function test_SetShares_RevertsWhenSumBelow10000() public {
        vm.prank(owner);
        vm.expectRevert(PaymentSplitter.InvalidBPS.selector);
        splitter.setShares(5000, 3000, 1000);
    }

    function test_SetShares_RevertsWhenSumAbove10000() public {
        vm.prank(owner);
        vm.expectRevert(PaymentSplitter.InvalidBPS.selector);
        splitter.setShares(6000, 3000, 2000);
    }

    function test_SetShares_RevertsWhenUint16Extremes() public {
        vm.prank(owner);
        vm.expectRevert(PaymentSplitter.InvalidBPS.selector);
        splitter.setShares(type(uint16).max, type(uint16).max, type(uint16).max);
    }

    function test_SetShares_OnlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        splitter.setShares(5000, 3000, 2000);
    }

    function testFuzz_SetShares_AlwaysSumTo10000OrRevert(uint16 a, uint16 t, uint16 p) public {
        vm.prank(owner);
        if (uint256(a) + t + p != 10_000) {
            vm.expectRevert(PaymentSplitter.InvalidBPS.selector);
            splitter.setShares(a, t, p);
            // trạng thái cũ giữ nguyên
            assertEq(uint256(splitter.artisanBPS()) + splitter.treasuryBPS() + splitter.platformBPS(), 10_000);
        } else {
            splitter.setShares(a, t, p);
            assertEq(uint256(splitter.artisanBPS()) + splitter.treasuryBPS() + splitter.platformBPS(), 10_000);
        }
    }

    function test_SetEcoRewardRate_UpdatesAndOnlyOwner() public {
        vm.expectEmit(address(splitter));
        emit EcoRewardRateUpdated(5 ether);
        vm.prank(owner);
        splitter.setEcoRewardRate(5 ether);
        assertEq(splitter.ecoRewardRate(), 5 ether);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        splitter.setEcoRewardRate(1);
    }

    // ------------------------------ splitPayment ------------------------------

    function test_SplitPayment_TransfersCorrectAmountToArtisan() public {
        uint256 before = artisan.balance;

        vm.prank(visitor);
        splitter.splitPayment{value: 1 ether}(artisan);

        assertEq(artisan.balance - before, 0.7 ether);
    }

    function test_SplitPayment_DepositsCorrectAmountToTreasury() public {
        vm.prank(visitor);
        splitter.splitPayment{value: 1 ether}(artisan);

        assertEq(treasury.totalDeposited(), 0.2 ether);
        assertEq(address(treasury).balance, 0.2 ether);
    }

    function test_SplitPayment_RetainsCorrectPlatformFee() public {
        vm.prank(visitor);
        splitter.splitPayment{value: 1 ether}(artisan);

        assertEq(splitter.pendingPlatformFees(), 0.1 ether);
        assertEq(address(splitter).balance, 0.1 ether);
    }

    function test_SplitPayment_MintsEcoTokenToVisitor() public {
        vm.expectEmit(true, false, false, true, address(splitter));
        emit EcoRewarded(visitor, 200 ether);

        vm.prank(visitor);
        splitter.splitPayment{value: 2 ether}(artisan);

        assertEq(eco.balanceOf(visitor), 200 ether); // 2 ETH * 100 ECO/ETH
        assertEq(eco.balanceOf(artisan), 0);
    }

    function test_SplitPayment_EmitsPaymentSplit() public {
        vm.expectEmit(true, false, false, true, address(splitter));
        emit PaymentSplit(artisan, 0.7 ether, 0.2 ether, 0.1 ether);

        vm.prank(visitor);
        splitter.splitPayment{value: 1 ether}(artisan);
    }

    function test_SplitPayment_RoundingDustGoesToPlatform() public {
        // 10 wei: artisan 7, treasury 2, platform 1 (chính xác)
        // 3 wei : artisan 2 (2.1), treasury 0 (0.6), platform 1 (dư)
        vm.prank(visitor);
        splitter.splitPayment{value: 3}(artisan);

        assertEq(artisan.balance, 2);
        assertEq(treasury.totalDeposited(), 0);
        assertEq(splitter.pendingPlatformFees(), 1);
    }

    function test_SplitPayment_SkipsZeroShares() public {
        // artisan 0%, treasury 0%, platform 100%
        vm.prank(owner);
        splitter.setShares(0, 0, 10_000);

        vm.prank(visitor);
        splitter.splitPayment{value: 1 ether}(artisan);

        assertEq(artisan.balance, 0);
        assertEq(treasury.totalDeposited(), 0);
        assertEq(splitter.pendingPlatformFees(), 1 ether);
    }

    function test_SplitPayment_NoMintWhenRewardRateZero() public {
        vm.prank(owner);
        splitter.setEcoRewardRate(0);

        vm.prank(visitor);
        splitter.splitPayment{value: 1 ether}(artisan);

        assertEq(eco.balanceOf(visitor), 0);
    }

    function test_SplitPayment_NoMintWhenRewardRoundsToZero() public {
        vm.prank(owner);
        splitter.setEcoRewardRate(1); // 1 wei ECO / 1 ETH => 1 wei payment => 0

        vm.prank(visitor);
        splitter.splitPayment{value: 1}(artisan);

        assertEq(eco.balanceOf(visitor), 0);
    }

    function test_SplitPayment_UsesUpdatedShares() public {
        vm.prank(owner);
        splitter.setShares(5000, 3000, 2000);

        vm.prank(visitor);
        splitter.splitPayment{value: 1 ether}(artisan);

        assertEq(artisan.balance, 0.5 ether);
        assertEq(treasury.totalDeposited(), 0.3 ether);
        assertEq(splitter.pendingPlatformFees(), 0.2 ether);
    }

    function test_SplitPayment_RevertsOnZeroArtisan() public {
        vm.prank(visitor);
        vm.expectRevert(PaymentSplitter.ZeroAddress.selector);
        splitter.splitPayment{value: 1 ether}(address(0));
    }

    function test_SplitPayment_RevertsOnZeroValue() public {
        vm.prank(visitor);
        vm.expectRevert(PaymentSplitter.ZeroPayment.selector);
        splitter.splitPayment{value: 0}(artisan);
    }

    function test_SplitPayment_RevertsWhenArtisanRejectsETH() public {
        address rejecter = address(new RejectETH());

        vm.prank(visitor);
        vm.expectRevert(PaymentSplitter.TransferFailed.selector);
        splitter.splitPayment{value: 1 ether}(rejecter);

        // revert toàn bộ: không có gì bị ghi sổ
        assertEq(splitter.pendingPlatformFees(), 0);
        assertEq(treasury.totalDeposited(), 0);
    }

    function test_Receive_RejectsDirectETH() public {
        vm.prank(visitor);
        (bool ok,) = address(splitter).call{value: 1 ether}("");
        assertFalse(ok);
    }

    function testFuzz_SplitPayment_ConservesFunds(uint96 amount, uint16 a, uint16 t) public {
        amount = uint96(bound(amount, 1, 100 ether));
        a = uint16(bound(a, 0, 10_000));
        t = uint16(bound(t, 0, 10_000 - a));
        uint16 p = 10_000 - a - t;

        vm.prank(owner);
        splitter.setShares(a, t, p);

        vm.prank(visitor);
        splitter.splitPayment{value: amount}(artisan);

        // artisan + treasury + platform == msg.value, không mất/không tạo thêm wei
        assertEq(artisan.balance + treasury.totalDeposited() + splitter.pendingPlatformFees(), amount);
        assertEq(address(splitter).balance, splitter.pendingPlatformFees());
    }

    // ------------------------------ reentrancy ------------------------------

    function test_Reentrancy_AttackFails() public {
        ReentrantArtisan attacker = new ReentrantArtisan(splitter, false);
        vm.deal(address(attacker), 10 ether);

        // Attacker re-enter => inner call bị guard chặn => receive() revert => TransferFailed
        vm.expectRevert(PaymentSplitter.TransferFailed.selector);
        attacker.attack{value: 1 ether}();

        assertEq(splitter.pendingPlatformFees(), 0);
        assertEq(address(splitter).balance, 0);
        assertEq(treasury.totalDeposited(), 0);
    }

    function test_Reentrancy_InnerCallBlockedByGuard() public {
        ReentrantArtisan attacker = new ReentrantArtisan(splitter, true);
        vm.deal(address(attacker), 10 ether);

        attacker.attack{value: 1 ether}();

        assertFalse(attacker.reentered());
        assertEq(bytes4(attacker.lastReason()), ReentrancyGuard.ReentrancyGuardReentrantCall.selector);

        assertEq(address(attacker).balance, 10.7 ether);
        
        assertEq(treasury.totalDeposited(), 0.2 ether);
        assertEq(splitter.pendingPlatformFees(), 0.1 ether);
    }

    function test_WithdrawPlatformFees_PaysOwnerAndResetsBalance() public {
        vm.prank(visitor);
        splitter.splitPayment{value: 1 ether}(artisan);

        address payable treasuryWallet = payable(makeAddr("platformWallet"));

        vm.expectEmit(true, false, false, true, address(splitter));
        emit PlatformFeesWithdrawn(treasuryWallet, 0.1 ether);

        vm.prank(owner);
        splitter.withdrawPlatformFees(treasuryWallet);

        assertEq(treasuryWallet.balance, 0.1 ether);
        assertEq(splitter.pendingPlatformFees(), 0);
        assertEq(address(splitter).balance, 0);
    }

    function test_WithdrawPlatformFees_OnlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        splitter.withdrawPlatformFees(payable(stranger));
    }

    function test_WithdrawPlatformFees_RevertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(PaymentSplitter.ZeroAddress.selector);
        splitter.withdrawPlatformFees(payable(address(0)));
    }

    function test_WithdrawPlatformFees_RevertsWhenNothingToWithdraw() public {
        vm.prank(owner);
        vm.expectRevert(PaymentSplitter.NothingToWithdraw.selector);
        splitter.withdrawPlatformFees(payable(owner));
    }

    function test_WithdrawPlatformFees_RevertsWhenRecipientRejectsETH() public {
        vm.prank(visitor);
        splitter.splitPayment{value: 1 ether}(artisan);

        address payable rejecter = payable(address(new RejectETH()));

        vm.prank(owner);
        vm.expectRevert(PaymentSplitter.TransferFailed.selector);
        splitter.withdrawPlatformFees(rejecter);

        // revert => số dư chờ rút vẫn còn nguyên
        assertEq(splitter.pendingPlatformFees(), 0.1 ether);
    }
}
