// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CommunityTreasury} from "../src/CommunityTreasury.sol";
import {MockPaymentSplitter, RejectingReceiver} from "./mocks/Mocks.sol";

contract CommunityTreasuryTest is Test {
    CommunityTreasury treasury;
    MockPaymentSplitter splitter;

    address owner = makeAddr("owner");
    address governance = makeAddr("governance");
    address attacker = makeAddr("attacker");
    address payable recipient = payable(makeAddr("recipient"));

    event FundsReceived(address indexed from, uint256 amount);
    event GovernanceSet(address indexed governance);
    event Disbursed(uint256 indexed proposalId, address indexed recipient, uint256 amount);

    function setUp() public {
        treasury = new CommunityTreasury(owner);
        splitter = new MockPaymentSplitter();
        vm.prank(owner);
        treasury.setGovernance(governance);
    }

    // ───────── Nhận ETH ─────────

    function test_ReceivesEthFromPaymentSplitter() public {
        vm.deal(address(splitter), 5 ether);

        vm.expectEmit(true, false, false, true);
        emit FundsReceived(address(splitter), 5 ether);
        splitter.release(payable(address(treasury)));

        assertEq(treasury.balance(), 5 ether);
        assertEq(address(treasury).balance, 5 ether);
    }

    function test_ReceivesEthDirectly() public {
        vm.deal(address(this), 1 ether);
        (bool ok,) = address(treasury).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(treasury.balance(), 1 ether);
    }

    // ───────── setGovernance ─────────

    function test_SetGovernance() public {
        CommunityTreasury t = new CommunityTreasury(owner);
        vm.expectEmit(true, false, false, false);
        emit GovernanceSet(governance);
        vm.prank(owner);
        t.setGovernance(governance);
        assertEq(t.governance(), governance);
    }

    function test_SetGovernance_RevertWhenNotOwner() public {
        CommunityTreasury t = new CommunityTreasury(owner);
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        t.setGovernance(governance);
    }

    function test_SetGovernance_RevertWhenAlreadySet() public {
        vm.prank(owner);
        vm.expectRevert(CommunityTreasury.GovernanceAlreadySet.selector);
        treasury.setGovernance(attacker);
    }

    function test_SetGovernance_RevertWhenZeroAddress() public {
        CommunityTreasury t = new CommunityTreasury(owner);
        vm.prank(owner);
        vm.expectRevert(CommunityTreasury.ZeroAddress.selector);
        t.setGovernance(address(0));
    }

    // ───────── disburse ─────────

    function test_Disburse_RevertWhenNotGovernance() public {
        vm.deal(address(treasury), 10 ether);
        vm.prank(attacker);
        vm.expectRevert(CommunityTreasury.NotGovernance.selector);
        treasury.disburse(1, recipient, 1 ether);

        // owner cũng không được gọi
        vm.prank(owner);
        vm.expectRevert(CommunityTreasury.NotGovernance.selector);
        treasury.disburse(1, recipient, 1 ether);
    }

    function test_Disburse_Success() public {
        vm.deal(address(treasury), 10 ether);

        vm.expectEmit(true, true, false, true);
        emit Disbursed(7, recipient, 3 ether);
        vm.prank(governance);
        treasury.disburse(7, recipient, 3 ether);

        assertEq(recipient.balance, 3 ether);
        assertEq(treasury.balance(), 7 ether);
    }

    function test_Disburse_RecordsHistory() public {
        vm.deal(address(treasury), 10 ether);
        vm.warp(1_000);
        vm.prank(governance);
        treasury.disburse(1, recipient, 1 ether);
        vm.warp(2_000);
        vm.prank(governance);
        treasury.disburse(2, payable(attacker), 2 ether);

        assertEq(treasury.disbursementsLength(), 2);

        (uint256 id0, address r0, uint256 a0, uint256 t0) = treasury.disbursements(0);
        assertEq(id0, 1);
        assertEq(r0, recipient);
        assertEq(a0, 1 ether);
        assertEq(t0, 1_000);

        (uint256 id1, address r1, uint256 a1, uint256 t1) = treasury.disbursements(1);
        assertEq(id1, 2);
        assertEq(r1, attacker);
        assertEq(a1, 2 ether);
        assertEq(t1, 2_000);
    }

    function test_Disburse_RevertWhenInsufficientBalance() public {
        vm.deal(address(treasury), 1 ether);
        vm.prank(governance);
        vm.expectRevert(abi.encodeWithSelector(CommunityTreasury.InsufficientBalance.selector, 1 ether, 2 ether));
        treasury.disburse(1, recipient, 2 ether);
    }

    function test_Disburse_RevertWhenZeroRecipient() public {
        vm.deal(address(treasury), 1 ether);
        vm.prank(governance);
        vm.expectRevert(CommunityTreasury.ZeroAddress.selector);
        treasury.disburse(1, payable(address(0)), 1 ether);
    }

    function test_Disburse_RevertWhenZeroAmount() public {
        vm.prank(governance);
        vm.expectRevert(CommunityTreasury.ZeroAmount.selector);
        treasury.disburse(1, recipient, 0);
    }

    function test_Disburse_RevertWhenRecipientRejects() public {
        RejectingReceiver bad = new RejectingReceiver();
        vm.deal(address(treasury), 1 ether);
        vm.prank(governance);
        vm.expectRevert(CommunityTreasury.TransferFailed.selector);
        treasury.disburse(1, payable(address(bad)), 1 ether);
        // revert → history không bị ghi
        assertEq(treasury.disbursementsLength(), 0);
    }
}
