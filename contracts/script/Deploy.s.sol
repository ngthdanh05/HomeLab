// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {VmSafe} from "forge-std/Vm.sol";
import {EcoToken} from "../src/EcoToken.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";
import {CommunityTreasury} from "../src/CommunityTreasury.sol";
import {Governance} from "../src/Governance.sol";
import {PaymentSplitter} from "../src/PaymentSplitter.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {CarbonOffset} from "../src/CarbonOffset.sol";
import {QuestRewards} from "../src/QuestRewards.sol";
import {QuestSetup} from "./QuestSetup.sol";

// =============================================================================
// Config is inlined: `new DeployConfig()` would add a broadcast tx and shift nonces.
// =============================================================================

/// @title Deploy
/// @notice Master deploy script for Eco-Tourism & Handicraft D2C platform.
///
/// Modes (env):
///   Full: ECO_TOKEN_ADDRESS unset or FRESH_DEPLOY=true; deploys all 8 contracts.
///   Resume: set *_ADDRESS vars to reuse deployed contracts.
///
/// Order: EcoToken, ImpactBadge, CommunityTreasury, Governance, PaymentSplitter, Marketplace, CarbonOffset, QuestRewards.
/// Roles and wiring happen in a second broadcast block.
contract Deploy is Script {
    error UnsupportedChain(uint256 chainId);

    // ─── Deployed contract references ───────────────────────────────────────
    EcoToken          public ecoToken;
    ImpactBadge       public impactBadge;
    CommunityTreasury public treasury;
    Governance        public governance;
    PaymentSplitter   public paymentSplitter;
    Marketplace       public marketplace;
    CarbonOffset      public carbonOffset;
    QuestRewards      public questRewards;

    // ─── Sepolia default config (inline constants) ───────────────────────────
    uint16  internal constant ARTISAN_BPS            = 7000;     // 70%
    uint16  internal constant TREASURY_BPS           = 2000;     // 20%
    uint16  internal constant PLATFORM_BPS           = 1000;     // 10%
    uint256 internal constant ECO_REWARD_RATE        = 100 ether;
    uint256 internal constant PROPOSAL_THRESHOLD     = 100 ether;
    uint256 internal constant QUORUM_BPS             = 500;      // 5%
    uint256 internal constant VOTING_PERIOD          = 3 days;
    uint256 internal constant CARBON_PRICE_PER_KG    = 0.00001 ether; // 100 kg CO2 = 0.001 ETH

    // ─── Anvil local overrides ────────────────────────────────────────────────
    uint256 internal constant PROPOSAL_THRESHOLD_LOCAL = 1 ether;
    uint256 internal constant QUORUM_BPS_LOCAL         = 100;    // 1%
    uint256 internal constant VOTING_PERIOD_LOCAL      = 1 hours;

    function run() external {
        // ─── Network config ────────────────────────
        bool isLocal       = block.chainid == 31337;
        // Defaults target testnet; other networks need their own config.
        _requireSupportedChain();

        // ─── Resolve deployer ─────────────────────────────────────────────────
        // Forge auto-loads .env; ignore it on Anvil or the script would resume from Sepolia addresses.
        uint256 deployerPrivateKey = isLocal ? 0 : vm.envOr("PRIVATE_KEY", uint256(0));
        address deployer = deployerPrivateKey != 0
            ? vm.addr(deployerPrivateKey)
            : msg.sender;
        uint256 threshold_ = isLocal ? PROPOSAL_THRESHOLD_LOCAL : PROPOSAL_THRESHOLD;
        uint256 quorum_    = isLocal ? QUORUM_BPS_LOCAL         : QUORUM_BPS;
        uint256 period_    = isLocal ? VOTING_PERIOD_LOCAL      : VOTING_PERIOD;

        // ─── Resume addresses from env ────────────────────────
        address existingEcoToken = _resumeAddress("ECO_TOKEN_ADDRESS");
        address existingBadge    = _resumeAddress("IMPACT_BADGE_ADDRESS");
        address existingTreasury = _resumeAddress("TREASURY_ADDRESS");
        address existingGovernance = _resumeAddress("GOVERNANCE_ADDRESS");
        address existingSplitter = _resumeAddress("PAYMENT_SPLITTER_ADDRESS");
        address existingMarketPlace = _resumeAddress("MARKETPLACE_ADDRESS");
        address existingCarbonOffset = _resumeAddress("CARBON_OFFSET_ADDRESS");
        address existingQuestRewards = _resumeAddress("QUEST_REWARDS_ADDRESS");

        console2.log("=== Starting Deployment ===");
        console2.log("Chain ID       :", block.chainid);
        console2.log("Deployer       :", deployer);
        if (existingEcoToken != address(0)) {
            console2.log("Resume mode    : ECO_TOKEN_ADDRESS =", existingEcoToken);
        }

        // =====================================================================
        // BROADCAST BLOCK 1: DEPLOY CONTRACTS
        // All CREATEs share one broadcast so Foundry tracks nonces and gas correctly.
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
        // 7. CarbonOffset
        if (existingCarbonOffset != address(0)) {
            carbonOffset = CarbonOffset(existingCarbonOffset);
            console2.log("7. CarbonOffset (reused):      ", address(carbonOffset));
        } else {
            carbonOffset = new CarbonOffset(
                address(impactBadge),
                address(treasury),
                CARBON_PRICE_PER_KG,
                deployer
            );
            console2.log("7. CarbonOffset deployed:      ", address(carbonOffset));
        }
        // 8. QuestRewards (Task 4.4)
        if (existingQuestRewards != address(0)) {
            questRewards = QuestRewards(existingQuestRewards);
            console2.log("8. QuestRewards (reused):      ", address(questRewards));
        } else {
            questRewards = new QuestRewards(
                address(ecoToken),
                address(impactBadge),
                address(carbonOffset),
                address(governance),
                deployer
            );
            console2.log("8. QuestRewards deployed:      ", address(questRewards));
        }
        // Flush broadcast 1.
        vm.stopBroadcast();

        // =====================================================================
        // BROADCAST BLOCK 2: ROLES AND WIRING
        // Separate from block 1 so addresses are confirmed before these calls.
        // =====================================================================
        if (deployerPrivateKey != 0) {
            vm.startBroadcast(deployerPrivateKey);
        } else {
            vm.startBroadcast();
        }

        _configure(deployer, isLocal, existingQuestRewards == address(0));

        vm.stopBroadcast();

        // ─── Save deployment file ────────────────────────
        _saveDeployments();
        console2.log("=== Deployment Finished Successfully ===");
    }

    function _requireSupportedChain() internal view {
        if (block.chainid != 31337 && block.chainid != 11155111) revert UnsupportedChain(block.chainid);
    }

    /// @dev Split from run() to avoid stack-too-deep.
    function _configure(address deployer, bool isLocal, bool addQuests) internal {
        bytes32 minterRole = keccak256("MINTER_ROLE");

        // EcoToken minters
        ecoToken.grantRole(minterRole, address(paymentSplitter));
        console2.log("EcoToken: MINTER_ROLE granted to PaymentSplitter");

        // ImpactBadge minters
        impactBadge.grantRole(minterRole, address(marketplace));
        impactBadge.grantRole(minterRole, address(carbonOffset));
        console2.log("ImpactBadge: MINTER_ROLE granted to Marketplace & CarbonOffset");

        // Purchase rewards only flow through Marketplace.
        paymentSplitter.setMarketplace(address(marketplace));

        // Local/E2E: disable verification and time locks for fast flows.
        if (isLocal) {
            marketplace.setArtisanVerificationRequired(false);
            governance.setVotingDelayBlocks(0);
            governance.setExecutionDelay(0);
            governance.setMaxDisbursementBps(10_000);
        }

        // QuestRewards: minter roles and default quests.
        ecoToken.grantRole(minterRole, address(questRewards));
        impactBadge.grantRole(minterRole, address(questRewards));
        if (addQuests) QuestSetup.addDefaultQuests(questRewards);
        console2.log("QuestRewards: MINTER_ROLE on EcoToken & ImpactBadge, quests:", questRewards.questCount());

        // setGovernance is one-shot, so skip it on resume.
        if (treasury.governance() == address(0)) treasury.setGovernance(address(governance));
        console2.log("CommunityTreasury: Governance set to", address(governance));

        // Deployer keeps admin only and cannot mint badges.
        impactBadge.revokeRole(minterRole, deployer);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /// @dev Address to reuse; always zero on Anvil or with FRESH_DEPLOY=true.
    function _resumeAddress(string memory envKey) internal view returns (address) {
        if (block.chainid == 31337 || vm.envOr("FRESH_DEPLOY", false)) return address(0);
        return vm.envOr(envKey, address(0));
    }

    function _saveDeployments() internal {
        // A dry run has predicted addresses; keep the real record.
        if (vm.isContext(VmSafe.ForgeContext.ScriptDryRun)) return;

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
        j = string.concat(j, '    "Marketplace": "',        vm.toString(address(marketplace)),     '",\n');
        j = string.concat(j, '    "CarbonOffset": "',       vm.toString(address(carbonOffset)),    '",\n');
        j = string.concat(j, '    "QuestRewards": "',       vm.toString(address(questRewards)),    '"\n');
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
