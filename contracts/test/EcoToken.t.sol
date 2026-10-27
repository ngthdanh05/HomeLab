// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {EcoToken} from "../src/EcoToken.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract EcoTokenTest is Test {
    EcoToken internal token;

    address internal owner = makeAddr("owner");
    address internal minter = makeAddr("minter"); // e.g. PaymentSplitter / Marketplace
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal attacker = makeAddr("attacker");

    uint256 internal constant MAX_SUPPLY = 100_000_000 * 10 ** 18;

    event TokensMinted(address indexed to, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function setUp() public {
        token = new EcoToken(owner);

        // Cache the role BEFORE pranking: vm.prank only affects the very next call,
        // and `token.MINTER_ROLE()` would otherwise consume it.
        bytes32 minterRole = token.MINTER_ROLE();
        vm.prank(owner);
        token.grantRole(minterRole, minter);
    }

    /*//////////////////////////////////////////////////////////////
                              DEPLOYMENT
    //////////////////////////////////////////////////////////////*/

    function test_Metadata() public view {
        assertEq(token.name(), "EcoToken");
        assertEq(token.symbol(), "ECO");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
    }

    function test_MaxSupplyAndCap() public view {
        assertEq(token.MAX_SUPPLY(), MAX_SUPPLY);
        assertEq(token.cap(), MAX_SUPPLY);
    }

    function test_InitialRoles() public view {
        assertEq(token.owner(), owner);
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), owner));
        // Owner does NOT automatically get the minter role.
        assertFalse(token.hasRole(token.MINTER_ROLE(), owner));
        assertTrue(token.hasRole(token.MINTER_ROLE(), minter));
    }

    function test_Constructor_RevertsOnZeroOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new EcoToken(address(0));
    }

    /*//////////////////////////////////////////////////////////////
                                 MINT
    //////////////////////////////////////////////////////////////*/

    function test_Mint_SucceedsWithMinterRole() public {
        vm.prank(minter);
        token.mint(alice, 1_000 ether);

        assertEq(token.balanceOf(alice), 1_000 ether);
        assertEq(token.totalSupply(), 1_000 ether);
    }

    function test_Mint_EmitsEvents() public {
        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), alice, 500 ether);
        vm.expectEmit(true, false, false, true);
        emit TokensMinted(alice, 500 ether);

        vm.prank(minter);
        token.mint(alice, 500 ether);
    }

    function test_Mint_RevertsWithoutMinterRole() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, attacker, token.MINTER_ROLE()
            )
        );
        vm.prank(attacker);
        token.mint(attacker, 1 ether);
    }

    function test_Mint_RevertsForOwnerWithoutMinterRole() public {
        bytes32 role = token.MINTER_ROLE();
        vm.prank(owner);
        token.revokeRole(role, owner);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, owner, role)
        );
        vm.prank(owner);
        token.mint(owner, 1 ether);
    }

    function test_Mint_RevertsToZeroAddress() public {
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InvalidReceiver.selector, address(0)));
        vm.prank(minter);
        token.mint(address(0), 1 ether);
    }

    /*//////////////////////////////////////////////////////////////
                              ROLE MGMT
    //////////////////////////////////////////////////////////////*/

    function test_Owner_CanGrantAndRevokeMinterRole() public {
        bytes32 role = token.MINTER_ROLE();

        vm.prank(owner);
        token.grantRole(role, bob);

        vm.prank(bob);
        token.mint(alice, 1 ether);
        assertEq(token.balanceOf(alice), 1 ether);

        vm.prank(owner);
        token.revokeRole(role, bob);

        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, bob, role));
        vm.prank(bob);
        token.mint(alice, 1 ether);
    }

    function test_GrantRole_RevertsForNonAdmin() public {
        bytes32 role = token.MINTER_ROLE();
        bytes32 adminRole = token.DEFAULT_ADMIN_ROLE();

        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, attacker, adminRole)
        );
        vm.prank(attacker);
        token.grantRole(role, attacker);
    }

    /*//////////////////////////////////////////////////////////////
                                  CAP
    //////////////////////////////////////////////////////////////*/

    function test_Mint_UpToMaxSupplySucceeds() public {
        vm.prank(minter);
        token.mint(alice, MAX_SUPPLY);

        assertEq(token.totalSupply(), MAX_SUPPLY);
    }

    function test_Mint_RevertsWhenSingleMintExceedsCap() public {
        vm.expectRevert(abi.encodeWithSelector(ERC20Capped.ERC20ExceededCap.selector, MAX_SUPPLY + 1, MAX_SUPPLY));
        vm.prank(minter);
        token.mint(alice, MAX_SUPPLY + 1);
    }

    function test_Mint_RevertsWhenCumulativeMintExceedsCap() public {
        vm.startPrank(minter);
        token.mint(alice, MAX_SUPPLY);

        vm.expectRevert(abi.encodeWithSelector(ERC20Capped.ERC20ExceededCap.selector, MAX_SUPPLY + 1, MAX_SUPPLY));
        token.mint(bob, 1);
        vm.stopPrank();

        assertEq(token.totalSupply(), MAX_SUPPLY);
    }

    function test_Burn_FreesCapacityForNewMints() public {
        vm.prank(minter);
        token.mint(alice, MAX_SUPPLY);

        vm.prank(alice);
        token.burn(100 ether);

        // Circular economy: burned supply can be re-minted, but never above the cap.
        vm.prank(minter);
        token.mint(bob, 100 ether);

        assertEq(token.totalSupply(), MAX_SUPPLY);
    }

    /*//////////////////////////////////////////////////////////////
                                 BURN
    //////////////////////////////////////////////////////////////*/

    function test_Burn_ReducesBalanceAndTotalSupply() public {
        vm.prank(minter);
        token.mint(alice, 1_000 ether);

        vm.prank(alice);
        token.burn(400 ether);

        assertEq(token.balanceOf(alice), 600 ether);
        assertEq(token.totalSupply(), 600 ether);
    }

    function test_Burn_EmitsTransferToZero() public {
        vm.prank(minter);
        token.mint(alice, 10 ether);

        vm.expectEmit(true, true, false, true);
        emit Transfer(alice, address(0), 10 ether);

        vm.prank(alice);
        token.burn(10 ether);
    }

    function test_Burn_AnyoneCanBurnOwnTokens() public {
        vm.startPrank(minter);
        token.mint(alice, 10 ether);
        token.mint(attacker, 10 ether);
        vm.stopPrank();

        vm.prank(attacker); // no special role needed
        token.burn(10 ether);

        assertEq(token.balanceOf(attacker), 0);
        assertEq(token.balanceOf(alice), 10 ether);
        assertEq(token.totalSupply(), 10 ether);
    }

    function test_Burn_RevertsWhenAmountExceedsBalance() public {
        vm.prank(minter);
        token.mint(alice, 1 ether);

        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, alice, 1 ether, 2 ether));
        vm.prank(alice);
        token.burn(2 ether);
    }

    function test_BurnFrom_UsesAllowance() public {
        vm.prank(minter);
        token.mint(alice, 100 ether);

        vm.prank(alice);
        token.approve(bob, 40 ether);

        vm.prank(bob);
        token.burnFrom(alice, 40 ether);

        assertEq(token.balanceOf(alice), 60 ether);
        assertEq(token.totalSupply(), 60 ether);
        assertEq(token.allowance(alice, bob), 0);
    }

    function test_BurnFrom_RevertsWithoutAllowance() public {
        vm.prank(minter);
        token.mint(alice, 100 ether);

        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, bob, 0, 1 ether));
        vm.prank(bob);
        token.burnFrom(alice, 1 ether);
    }

    /*//////////////////////////////////////////////////////////////
                         OWNERSHIP <-> ADMIN SYNC
    //////////////////////////////////////////////////////////////*/

    function test_TransferOwnership_MovesAdminRole() public {
        bytes32 adminRole = token.DEFAULT_ADMIN_ROLE();

        vm.prank(owner);
        token.transferOwnership(bob);

        assertEq(token.owner(), bob);
        assertTrue(token.hasRole(adminRole, bob));
        assertFalse(token.hasRole(adminRole, owner));

        // Old owner can no longer manage roles, new owner can.
        bytes32 minterRole = token.MINTER_ROLE();
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, owner, adminRole)
        );
        vm.prank(owner);
        token.grantRole(minterRole, owner);

        vm.prank(bob);
        token.grantRole(minterRole, bob);
        assertTrue(token.hasRole(minterRole, bob));
    }

    function test_RenounceOwnership_RevokesAdminAndGrantsNothingToZero() public {
        vm.prank(owner);
        token.renounceOwnership();

        assertEq(token.owner(), address(0));
        assertFalse(token.hasRole(token.DEFAULT_ADMIN_ROLE(), owner));
        assertFalse(token.hasRole(token.DEFAULT_ADMIN_ROLE(), address(0)));
    }

    function test_TransferOwnership_RevertsForNonOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        vm.prank(attacker);
        token.transferOwnership(attacker);
    }

    /*//////////////////////////////////////////////////////////////
                                 FUZZ
    //////////////////////////////////////////////////////////////*/

    function testFuzz_Mint_WithinCap(address to, uint256 amount) public {
        vm.assume(to != address(0));
        amount = bound(amount, 0, MAX_SUPPLY);

        vm.prank(minter);
        token.mint(to, amount);

        assertEq(token.balanceOf(to), amount);
        assertEq(token.totalSupply(), amount);
        assertLe(token.totalSupply(), MAX_SUPPLY);
    }

    function testFuzz_Mint_AboveCapReverts(uint256 amount) public {
        amount = bound(amount, MAX_SUPPLY + 1, type(uint128).max);

        vm.expectRevert(abi.encodeWithSelector(ERC20Capped.ERC20ExceededCap.selector, amount, MAX_SUPPLY));
        vm.prank(minter);
        token.mint(alice, amount);
    }

    function testFuzz_Mint_NonMinterReverts(address caller, uint256 amount) public {
        vm.assume(caller != minter);
        bytes32 role = token.MINTER_ROLE();

        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, caller, role));
        vm.prank(caller);
        token.mint(alice, amount);
    }

    function testFuzz_Burn(uint256 mintAmount, uint256 burnAmount) public {
        mintAmount = bound(mintAmount, 0, MAX_SUPPLY);
        burnAmount = bound(burnAmount, 0, mintAmount);

        vm.prank(minter);
        token.mint(alice, mintAmount);

        vm.prank(alice);
        token.burn(burnAmount);

        assertEq(token.balanceOf(alice), mintAmount - burnAmount);
        assertEq(token.totalSupply(), mintAmount - burnAmount);
    }
}
