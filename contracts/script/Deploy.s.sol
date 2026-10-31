// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {EcoToken} from "../src/EcoToken.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";
import {CommunityTreasury} from "../src/CommunityTreasury.sol";
import {Governance} from "../src/Governance.sol";
import {PaymentSplitter} from "../src/PaymentSplitter.sol";
import {Marketplace} from "../src/Marketplace.sol";

// =============================================================================
// DEPLOY CONFIG — Inline (không dùng `new DeployConfig()` để tránh tạo thêm
//                          transaction trong broadcast và gây lệch nonce)
// =============================================================================

/// @title Deploy
/// @notice Master deploy script for Eco-Tourism & Handicraft D2C platform.
///
/// Chế độ hoạt động (qua biến môi trường):
///   FULL DEPLOY  : không set ECO_TOKEN_ADDRESS  → deploy tất cả 6 contracts
///   RESUME DEPLOY: set ECO_TOKEN_ADDRESS=<addr> → bỏ qua EcoToken, deploy 5 contracts còn lại
///                  (tùy chọn: set IMPACT_BADGE_ADDRESS, TREASURY_ADDRESS để resume thêm)
///
/// Thứ tự deploy: EcoToken → ImpactBadge → CommunityTreasury → Governance → PaymentSplitter → Marketplace
/// Post-deploy : grantRole + setGovernance trong broadcast block 2 riêng biệt
contract Deploy is Script {
    // ─── Deployed contract references ───────────────────────────────────────
    EcoToken          public ecoToken;
    ImpactBadge       public impactBadge;
    CommunityTreasury public treasury;
    Governance        public governance;
    PaymentSplitter   public paymentSplitter;
    Marketplace       public marketplace;

    // ─── Sepolia default config (inline constants) ───────────────────────────
    uint16  internal constant ARTISAN_BPS            = 7000;     // 70%
    uint16  internal constant TREASURY_BPS           = 2000;     // 20%
    uint16  internal constant PLATFORM_BPS           = 1000;     // 10%
    uint256 internal constant ECO_REWARD_RATE        = 100 ether;
    uint256 internal constant PROPOSAL_THRESHOLD     = 100 ether;
    uint256 internal constant QUORUM_BPS             = 500;      // 5%
    uint256 internal constant VOTING_PERIOD          = 3 days;

    // ─── Anvil local overrides ────────────────────────────────────────────────
    uint256 internal constant PROPOSAL_THRESHOLD_LOCAL = 1 ether;
    uint256 internal constant QUORUM_BPS_LOCAL         = 100;    // 1%
    uint256 internal constant VOTING_PERIOD_LOCAL      = 1 hours;

    function run() external {
        // ─── Resolve deployer ─────────────────────────────────────────────────
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        address deployer = deployerPrivateKey != 0
            ? vm.addr(deployerPrivateKey)
            : msg.sender;

        // ─── Network config (inline — không khởi tạo contract helper) ─────────
        bool isLocal       = block.chainid == 31337;
        uint256 threshold_ = isLocal ? PROPOSAL_THRESHOLD_LOCAL : PROPOSAL_THRESHOLD;
        uint256 quorum_    = isLocal ? QUORUM_BPS_LOCAL         : QUORUM_BPS;
        uint256 period_    = isLocal ? VOTING_PERIOD_LOCAL      : VOTING_PERIOD;

        // ─── Đọc địa chỉ resume từ env ────────────────────────────────────────
        address existingEcoToken = vm.envOr("ECO_TOKEN_ADDRESS",    address(0));
        address existingBadge    = vm.envOr("IMPACT_BADGE_ADDRESS", address(0));
        address existingTreasury = vm.envOr("TREASURY_ADDRESS",     address(0));
        address existingGovernance = vm.envOr("GOVERNANCE_ADDRESS",   address(0));
        address existingSplitter = vm.envOr("PAYMENT_SPLITTER_ADDRESS",   address(0));
        address existingMarketPlace = vm.envOr("MARKETPLACE_ADDRESS",   address(0));

        console2.log("=== Starting Deployment ===");
        console2.log("Chain ID       :", block.chainid);
        console2.log("Deployer       :", deployer);
        if (existingEcoToken != address(0)) {
            console2.log("Resume mode    : ECO_TOKEN_ADDRESS =", existingEcoToken);
        }

        // =====================================================================
        // BROADCAST BLOCK 1: DEPLOY CONTRACTS
        // Tất cả CREATE transactions được gom vào 1 broadcast để Foundry có
        // thể estimate nonce và gas limit chính xác.
        // =====================================================================
        if (deployerPrivateKey != 0) {
            vm.startBroadcast(deployerPrivateKey);
        } else {
            vm.startBroadcast();
        }

        // 1. EcoToken
        if (existingEcoToken != address(0)) {
            ecoToken = EcoToken(existingEcoToken);
            console2.log("1. EcoToken (reused):          ", existingEcoToken);
        } else {
            ecoToken = new EcoToken(deployer);
            console2.log("1. EcoToken deployed:          ", address(ecoToken));
        }

        // 2. ImpactBadge
        if (existingBadge != address(0)) {
            impactBadge = ImpactBadge(existingBadge);
            console2.log("2. ImpactBadge (reused):       ", existingBadge);
        } else {
            impactBadge = new ImpactBadge(deployer);
            console2.log("2. ImpactBadge deployed:       ", address(impactBadge));
        }

        // 3. CommunityTreasury
        if (existingTreasury != address(0)) {
            treasury = CommunityTreasury(payable(existingTreasury));
            console2.log("3. CommunityTreasury (reused): ", existingTreasury);
        } else {
            treasury = new CommunityTreasury(deployer);
            console2.log("3. CommunityTreasury deployed: ", address(treasury));
        }

        // 4. Governance
        if (existingGovernance != address(0)) {
            governance = Governance(existingGovernance);
            console2.log("4. Governance (reused):         ", address(governance));
        } else {
        governance = new Governance(
            address(ecoToken),
            payable(address(treasury)),
            threshold_,
            quorum_,
            period_,
            deployer
            );
            console2.log("4. Governance deployed:        ", address(governance));
        }
       
        // 5. PaymentSplitter
        if (existingSplitter != address(0)) {
            paymentSplitter = PaymentSplitter(existingSplitter);
            console2.log("5. PaymentSplitter (reused):         ", address(paymentSplitter));
        } else {
            paymentSplitter = new PaymentSplitter(
                address(treasury),
                address(ecoToken),
                ARTISAN_BPS,
                TREASURY_BPS,
                PLATFORM_BPS,
                ECO_REWARD_RATE
            );
            console2.log("5. PaymentSplitter deployed:   ", address(paymentSplitter));
        }
        // 6. Marketplace
        if (existingMarketPlace != address(0)) {
            marketplace = Marketplace(existingMarketPlace);
            console2.log("6. MarketPlace (reused):         ", address(marketplace));
        } else {
            marketplace = new Marketplace(
                address(paymentSplitter),
                address(impactBadge),
                deployer
            );
            console2.log("6. Marketplace deployed:       ", address(marketplace));
        }
        // Flush Broadcast 1 — đẩy tất cả CREATE transactions lên node
        vm.stopBroadcast();

        // =====================================================================
        // BROADCAST BLOCK 2: POST-DEPLOY — PHÂN QUYỀN & CẤU HÌNH
        // Tách biệt hoàn toàn với Broadcast 1 để:
        //   (a) Tránh nonce race condition
        //   (b) Đảm bảo địa chỉ contracts đã xác nhận trên chain trước khi gọi
        // =====================================================================
        if (deployerPrivateKey != 0) {
            vm.startBroadcast(deployerPrivateKey);
        } else {
            vm.startBroadcast();
        }

        bytes32 minterRole = keccak256("MINTER_ROLE");

        // Grant MINTER_ROLE trên EcoToken
        ecoToken.grantRole(minterRole, address(paymentSplitter));
        ecoToken.grantRole(minterRole, address(marketplace));
        console2.log("EcoToken: MINTER_ROLE granted to PaymentSplitter & Marketplace");

        // Grant MINTER_ROLE trên ImpactBadge
        impactBadge.grantRole(minterRole, address(marketplace));
        impactBadge.grantRole(minterRole, address(paymentSplitter));
        console2.log("ImpactBadge: MINTER_ROLE granted to Marketplace & PaymentSplitter");

        // Set Governance trên CommunityTreasury
        treasury.setGovernance(address(governance));
        console2.log("CommunityTreasury: Governance set to", address(governance));

        vm.stopBroadcast();

        // ─── Lưu file deployments ─────────────────────────────────────────────
        _saveDeployments();
        console2.log("=== Deployment Finished Successfully ===");
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function _saveDeployments() internal {
        string memory net  = _networkName();
        string memory path = string.concat("deployments/", net, ".json");

        string memory j = "{\n";
        j = string.concat(j, '  "network": "',        net,                                     '",\n');
        j = string.concat(j, '  "chainId": ',         vm.toString(block.chainid),              ',\n');
        j = string.concat(j, '  "timestamp": ',       vm.toString(block.timestamp),            ',\n');
        j = string.concat(j, '  "contracts": {\n');
        j = string.concat(j, '    "EcoToken": "',           vm.toString(address(ecoToken)),        '",\n');
        j = string.concat(j, '    "ImpactBadge": "',        vm.toString(address(impactBadge)),     '",\n');
        j = string.concat(j, '    "CommunityTreasury": "',  vm.toString(address(treasury)),        '",\n');
        j = string.concat(j, '    "Governance": "',         vm.toString(address(governance)),      '",\n');
        j = string.concat(j, '    "PaymentSplitter": "',    vm.toString(address(paymentSplitter)), '",\n');
        j = string.concat(j, '    "Marketplace": "',        vm.toString(address(marketplace)),     '"\n');
        j = string.concat(j, '  }\n');
        j = string.concat(j, '}\n');

        vm.writeFile(path, j);
        console2.log("Deployments saved to:", path);
    }

    function _networkName() internal view returns (string memory) {
        if (block.chainid == 11155111) return "sepolia";
        if (block.chainid == 31337)    return "local";
        return "unknown";
    }
}
