# PLAN.md — MyHomeLab: Regenerative Digital Eco-Tourism Platform

## Table of Contents

1. [Overview & Vision](#1-overview--vision)
2. [System Architecture](#2-system-architecture)
3. [Smart Contracts Data Model](#3-smart-contracts-data-model)
4. [Task Breakdown by Phase](#4-task-breakdown-by-phase)
   - [Phase 1 – Smart Contracts Core & Revenue Splitting Logic](#phase-1--smart-contracts-core--revenue-splitting-logic)
   - [Phase 2 – Local Deployment & On-chain Verification](#phase-2--local-deployment--on-chain-verification)
   - [Phase 3 – AI Engine Integration & Digital Archive](#phase-3--ai-engine-integration--digital-archive)
   - [Phase 4 – Next.js Web3 Frontend & D2C Marketplace](#phase-4--nextjs-web3-frontend--d2c-marketplace)
   - [Phase 5 – Community Governance DAO UI & End-to-End Testing](#phase-5--community-governance-dao-ui--end-to-end-testing)
5. [Tech Stack Reference](#5-tech-stack-reference)
6. [Risk & Dependency Map](#6-risk--dependency-map)

---

## 1. Overview & Vision

### Project Name

**MyHomeLab** – Hệ sinh thái Du lịch số Tuần hoàn & Tái tạo  
_(Regenerative Digital Eco-Tourism Platform)_

### Mission Statement

Xây dựng nền tảng du lịch sinh thái minh bạch, kết hợp **Web3**, **AI** và mô hình kinh tế **D2C tuần hoàn (Circular Economy)**. Mục tiêu cốt lõi:

- **Chống tẩy xanh (Anti-Greenwashing)**: Mọi tuyên bố "xanh" đều được ghi nhận on-chain với bằng chứng hành động thực tế.
- **D2C Direct Payment**: Doanh thu phân chia tức thời qua Smart Contract — không qua trung gian.
- **Tái đầu tư tự động**: Phần trăm doanh thu tự chảy vào Quỹ Cộng đồng (Community Treasury), được quản trị bởi DAO.
- **Số hóa di sản**: AI Travel Assistant + lưu trữ di sản 360° giúp bảo tồn văn hóa địa phương.

### Core Value Loop

```
Du khách đặt tour / mua đồ thủ công
        │
        ▼
 Smart Contract (PaymentSplitter)
  ┌─────┴──────────────────────────┐
  │  X% → Nghệ nhân / Chủ nhà      │
  │  Y% → Community Treasury DAO   │
  │  Z% → Platform Fee             │
  └────────────────────────────────┘
        │
        ▼
 NFT ImpactBadge phát hành (Proof of Action)
        │
        ▼
 EcoToken thưởng cho du khách (Circular Reward)
        │
        ▼
 DAO Voting → Rót vốn bảo tồn địa phương
```

---

## 2. System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MYHOMELAB ECOSYSTEM                          │
├──────────────────┬──────────────────────┬───────────────────────────┤
│   FRONTEND LAYER │    AI ENGINE LAYER   │    BLOCKCHAIN LAYER        │
│                  │                      │                            │
│  Next.js 14      │  Gemini API          │  Solidity Contracts        │
│  (App Router)    │  (Edge Runtime)      │  (OpenZeppelin)            │
│  TypeScript      │                      │                            │
│  Tailwind CSS    │  AI Travel Assistant │  ┌─────────────────────┐  │
│  Three.js        │  Culture Guide Bot   │  │ EcoToken.sol        │  │
│  (360° Archive)  │  Itinerary Planner   │  │ (ERC-20 Reward)     │  │
│                  │                      │  ├─────────────────────┤  │
│  Web3 Layer:     │  Digital Archive:    │  │ ImpactBadge.sol     │  │
│  Wagmi v2        │  360° Viewer         │  │ (ERC-721 NFT)       │  │
│  Viem            │  Language/Culture    │  ├─────────────────────┤  │
│  ConnectKit      │  Learning Module     │  │ PaymentSplitter.sol │  │
│  React Query     │                      │  ├─────────────────────┤  │
│                  │                      │  │ Marketplace.sol     │  │
│                  │                      │  ├─────────────────────┤  │
│                  │                      │  │ CommunityTreasury   │  │
│                  │                      │  │ + Governance.sol    │  │
│                  │                      │  └─────────────────────┘  │
├──────────────────┴──────────────────────┴───────────────────────────┤
│                         NETWORK LAYER                               │
│          Anvil (Local)  ←→  Sepolia Testnet  ←→  Mainnet (future)  │
└─────────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
User → ConnectKit: Connect Wallet
User → Next.js UI: Browse D2C Shop / Tours
Next.js UI → Gemini API: Request AI Itinerary / Culture Tips
Gemini API → Next.js UI: Personalized Suggestions
User → Wagmi/Viem: Sign Purchase Transaction
Wagmi/Viem → PaymentSplitter.sol: Execute Payment
PaymentSplitter.sol → Artisan Wallet: X% Instant Transfer
PaymentSplitter.sol → CommunityTreasury: Y% Deposit
PaymentSplitter.sol → Platform Wallet: Z% Fee
ImpactBadge.sol → User Wallet: Mint NFT (Proof of Action)
EcoToken.sol → User Wallet: Mint Reward Tokens
User → Governance.sol: Participate in DAO Vote
```

---

## 3. Smart Contracts Data Model

### 3.1 `EcoToken.sol` (ERC-20) — Circular Reward Token

| Field         | Type      | Description                        |
| ------------- | --------- | ---------------------------------- |
| `name`        | `string`  | `"EcoToken"`                       |
| `symbol`      | `string`  | `"ECO"`                            |
| `decimals`    | `uint8`   | `18`                               |
| `totalSupply` | `uint256` | Capped (e.g., 100,000,000 ECO)     |
| `minter`      | `address` | Only PaymentSplitter & Marketplace |

**Core Functions:**

```solidity
function mint(address to, uint256 amount) external onlyMinter
function burn(uint256 amount) external
function approve(address spender, uint256 amount) external returns (bool)
// Standard ERC-20 inherited from OpenZeppelin
```

**Business Logic:**

- Du khách nhận ECO Token mỗi lần hoàn tất booking hoặc claim ImpactBadge.
- ECO có thể dùng để giảm giá tour hoặc vote trong DAO.
- Capped supply để kiểm soát lạm phát.

---

### 3.2 `ImpactBadge.sol` (ERC-721) — NFT Proof of Action

| Field       | Type      | Description                                                         |
| ----------- | --------- | ------------------------------------------------------------------- |
| `tokenId`   | `uint256` | Auto-increment                                                      |
| `recipient` | `address` | Du khách nhận badge                                                 |
| `badgeType` | `enum`    | `ECO_CHECKIN`, `ZERO_CARBON`, `CULTURE_GUARDIAN`, `COMMUNITY_DONOR` |
| `metadata`  | `string`  | IPFS URI → `{action, location, timestamp, carbonOffset}`            |
| `issuedAt`  | `uint256` | Block timestamp                                                     |

**Core Functions:**

```solidity
function mintBadge(address to, BadgeType badgeType, string memory metadataURI) external onlyMinter returns (uint256 tokenId)
function getBadgesByOwner(address owner) external view returns (uint256[] memory)
function tokenURI(uint256 tokenId) public view override returns (string memory)
```

**Business Logic:**

- Mỗi booking thành công → mint 1 `ECO_CHECKIN` badge.
- Upload ảnh bù đắp carbon → mint `ZERO_CARBON` badge.
- Đóng góp vào Treasury vượt ngưỡng → mint `COMMUNITY_DONOR` badge.
- Metadata stored on IPFS (decentralized, anti-tampering).

---

### 3.3 `PaymentSplitter.sol` & `Marketplace.sol` — D2C Revenue Splitting

**PaymentSplitter.sol:**

| Parameter           | Type      | Description                            |
| ------------------- | --------- | -------------------------------------- |
| `artisanShare`      | `uint16`  | BPS (basis points), e.g., `7000` = 70% |
| `treasuryShare`     | `uint16`  | BPS, e.g., `2000` = 20%                |
| `platformShare`     | `uint16`  | BPS, e.g., `1000` = 10%                |
| `communityTreasury` | `address` | Contract address of Treasury           |
| `platformWallet`    | `address` | Platform fee recipient                 |

**Core Functions:**

```solidity
function splitPayment(address artisan, uint256 totalAmount) external payable
function updateShares(uint16 _artisan, uint16 _treasury, uint16 _platform) external onlyOwner
function withdrawPlatformFees() external onlyOwner
// Emits: PaymentSplit(artisan, artisanAmt, treasuryAmt, platformAmt)
```

**Marketplace.sol:**

| Field         | Type      | Description                        |
| ------------- | --------- | ---------------------------------- |
| `listingId`   | `uint256` | Auto-increment                     |
| `seller`      | `address` | Artisan / Tour operator            |
| `price`       | `uint256` | In wei (native token)              |
| `productType` | `enum`    | `HANDICRAFT`, `TOUR`, `EXPERIENCE` |
| `isActive`    | `bool`    | Listing status                     |
| `metadataURI` | `string`  | IPFS product details               |

**Core Functions:**

```solidity
function createListing(uint256 price, ProductType pType, string memory metadataURI) external returns (uint256 listingId)
function purchaseListing(uint256 listingId) external payable
function cancelListing(uint256 listingId) external
function getActiveListing(uint256 listingId) external view returns (Listing memory)
```

---

### 3.4 `CommunityTreasury.sol` & `Governance.sol` — DAO Fund & Voting

**CommunityTreasury.sol:**

| Field                 | Type      | Description                       |
| --------------------- | --------- | --------------------------------- |
| `totalDeposited`      | `uint256` | Tổng ETH đã nạp                   |
| `totalDisbursed`      | `uint256` | Tổng ETH đã giải ngân             |
| `balance`             | `uint256` | Số dư hiện tại                    |
| `disbursementHistory` | `mapping` | `proposalId → DisbursementRecord` |

**Core Functions:**

```solidity
function deposit() external payable  // Called by PaymentSplitter
function disburse(address recipient, uint256 amount, uint256 proposalId) external onlyGovernance
function getBalance() external view returns (uint256)
function getDisbursementRecord(uint256 proposalId) external view returns (DisbursementRecord memory)
```

**Governance.sol (DAO):**

| Field             | Type      | Description                                           |
| ----------------- | --------- | ----------------------------------------------------- |
| `proposalId`      | `uint256` | Auto-increment                                        |
| `proposer`        | `address` | Người đề xuất                                         |
| `description`     | `string`  | Mô tả dự án bảo tồn                                   |
| `requestedAmount` | `uint256` | ETH yêu cầu                                           |
| `votesFor`        | `uint256` | Phiếu đồng ý (ECO Token weighted)                     |
| `votesAgainst`    | `uint256` | Phiếu phản đối                                        |
| `status`          | `enum`    | `PENDING`, `ACTIVE`, `PASSED`, `REJECTED`, `EXECUTED` |
| `deadline`        | `uint256` | Voting deadline (block timestamp)                     |

**Core Functions:**

```solidity
function propose(string memory description, uint256 requestedAmount, address recipient) external returns (uint256 proposalId)
function vote(uint256 proposalId, bool support) external  // Weighted by ECO balance
function execute(uint256 proposalId) external             // Triggers Treasury.disburse()
function getProposal(uint256 proposalId) external view returns (Proposal memory)
function getActiveProposals() external view returns (uint256[] memory)
```

---

## 4. Task Breakdown by Phase

---

### Phase 1 – Smart Contracts Core & Revenue Splitting Logic

> **Goal**: Xây dựng và kiểm thử toàn bộ lớp Smart Contract on-chain, đảm bảo logic phân chia doanh thu và DAO hoạt động chính xác trước khi tích hợp frontend.

---

#### Task 1.1 — Foundry Project Setup & Dev Environment

- **Objective**: Khởi tạo dự án Foundry, cấu hình OpenZeppelin dependencies, Makefile và cấu trúc thư mục chuẩn.
- **Files**:
  - `foundry.toml`
  - `Makefile`
  - `.env.example`
  - `src/` _(thư mục contracts)_
  - `test/` _(thư mục unit tests)_
  - `script/` _(thư mục deploy scripts)_
  - `lib/openzeppelin-contracts/` _(via forge install)_
- **Details**:
  - Chạy `forge init` với cấu trúc thư mục chuẩn.
  - Cài đặt OpenZeppelin: `forge install OpenZeppelin/openzeppelin-contracts`.
  - Cấu hình `foundry.toml`: `remappings`, `optimizer`, `via_ir`.
  - Tạo `Makefile` với các target: `make build`, `make test`, `make deploy-local`, `make deploy-sepolia`.
  - Tạo `.env.example` với các biến: `PRIVATE_KEY`, `SEPOLIA_RPC_URL`, `ETHERSCAN_API_KEY`.
- **Definition of Done (DoD)**:
  - [x] `forge build` chạy thành công, không có lỗi compile.
  - [x] `forge test` chạy được (dù chưa có test nào, exit code 0).
  - [x] `make build` và `make test` hoạt động qua Makefile.
  - [x] `.env.example` đã có đủ biến cần thiết, `.env` được gitignore.

---

#### Task 1.2 — `EcoToken.sol` (ERC-20 Circular Reward Token)

- **Objective**: Implement ERC-20 token với capped supply, access-controlled minting và burn mechanism.
- **Files**:
  - `src/EcoToken.sol`
  - `test/EcoToken.t.sol`
- **Details**:
  - Kế thừa `ERC20`, `ERC20Capped`, `Ownable` từ OpenZeppelin.
  - Implement `MINTER_ROLE` (AccessControl) chỉ cho phép PaymentSplitter & Marketplace mint.
  - `MAX_SUPPLY = 100_000_000 * 10**18`.
  - Hàm `mint(address to, uint256 amount)` require `hasRole(MINTER_ROLE)`.
  - Hàm `burn(uint256 amount)` public, ai cũng gọi được.
  - Emit event `TokensMinted(address indexed to, uint256 amount)`.
- **Definition of Done (DoD)**:
  - [x] Contract compile không warning.
  - [x] Unit test: mint thành công khi caller có MINTER_ROLE.
  - [x] Unit test: mint revert khi caller không có MINTER_ROLE.
  - [x] Unit test: tổng supply không vượt MAX_SUPPLY (capped revert).
  - [x] Unit test: burn giảm đúng balance và totalSupply.
  - [x] Test coverage ≥ 90% cho `EcoToken.sol`.

---

#### Task 1.3 — `ImpactBadge.sol` (ERC-721 NFT Proof of Action)

- **Objective**: Implement NFT certificate với nhiều loại badge, metadata on IPFS và kiểm soát mint qua role.
- **Files**:
  - `src/ImpactBadge.sol`
  - `test/ImpactBadge.t.sol`
- **Details**:
  - Kế thừa `ERC721`, `ERC721URIStorage`, `AccessControl` từ OpenZeppelin.
  - Define `enum BadgeType { ECO_CHECKIN, ZERO_CARBON, CULTURE_GUARDIAN, COMMUNITY_DONOR }`.
  - Struct `Badge { BadgeType badgeType; uint256 issuedAt; address recipient }`.
  - Mapping `tokenId → Badge` để lưu metadata on-chain.
  - Hàm `mintBadge(address to, BadgeType, string metadataURI)` returns `tokenId`, require `MINTER_ROLE`.
  - `tokenURI()` override trả về IPFS URI.
  - Emit event `BadgeMinted(address indexed to, uint256 tokenId, BadgeType badgeType)`.
- **Definition of Done (DoD)**:
  - [x] Contract compile không warning.
  - [x] Unit test: mint badge thành công, tokenId tăng đúng.
  - [x] Unit test: `getBadgesByOwner()` trả về đúng danh sách tokenId.
  - [x] Unit test: `tokenURI()` trả về đúng IPFS URI.
  - [x] Unit test: transfer badge hoạt động đúng (ERC-721 standard).
  - [x] Unit test: mint revert khi không có MINTER_ROLE.
  - [x] Test coverage ≥ 90% cho `ImpactBadge.sol`.

---

#### Task 1.4 — `PaymentSplitter.sol` — Automated Revenue Distribution

- **Objective**: Implement logic phân tách doanh thu tự động khi có giao dịch mua hàng D2C.
- **Files**:
  - `src/PaymentSplitter.sol`
  - `test/PaymentSplitter.t.sol`
- **Details**:
  - Shares được lưu dạng Basis Points (BPS): `artisanBPS + treasuryBPS + platformBPS = 10000`.
  - Hàm `splitPayment(address artisan)` payable: tính và chuyển tiền ngay lập tức (pull-over-push pattern cho platform fee để tránh reentrancy).
  - Integrate với `CommunityTreasury.deposit()` cho treasury share.
  - Integrate với `EcoToken.mint()` để reward du khách sau mỗi giao dịch.
  - `onlyOwner` có thể update BPS ratios.
  - Emit event `PaymentSplit(address artisan, uint256 artisanAmt, uint256 treasuryAmt, uint256 platformAmt)`.
  - Guard: `ReentrancyGuard` từ OpenZeppelin.
- **Definition of Done (DoD)**:
  - [x] Contract compile không warning.
  - [x] Unit test: tổng BPS luôn = 10000, revert nếu sai.
  - [x] Unit test: `splitPayment` chuyển đúng số tiền đến artisan wallet.
  - [x] Unit test: `splitPayment` deposit đúng Y% vào Treasury.
  - [x] Unit test: `splitPayment` giữ lại đúng Z% platform fee.
  - [x] Unit test: du khách nhận EcoToken sau khi split.
  - [x] Unit test: reentrancy attack thất bại.
  - [x] Test coverage ≥ 95% cho `PaymentSplitter.sol`.

---

#### Task 1.5 — `Marketplace.sol` — D2C Product Listings

- **Objective**: Implement marketplace cho phép nghệ nhân tạo listing và du khách mua trực tiếp.
- **Files**:
  - `src/Marketplace.sol`
  - `test/Marketplace.t.sol`
- **Details**:
  - Struct `Listing { uint256 id; address seller; uint256 price; ProductType pType; string metadataURI; bool isActive }`.
  - `createListing()`: nghệ nhân tạo listing, emit `ListingCreated`.
  - `purchaseListing(uint256 listingId)` payable: validate price, gọi `PaymentSplitter.splitPayment()`, deactivate listing, mint `ImpactBadge` cho buyer.
  - `cancelListing()`: chỉ seller hoặc owner mới cancel được.
  - Emit events: `ListingCreated`, `ListingPurchased`, `ListingCancelled`.
- **Definition of Done (DoD)**:
  - [x] Contract compile không warning.
  - [x] Unit test: tạo listing thành công, ID tăng đúng.
  - [x] Unit test: mua listing → tiền phân chia đúng qua PaymentSplitter.
  - [x] Unit test: mua listing → buyer nhận ImpactBadge.
  - [x] Unit test: revert khi mua listing không active.
  - [x] Unit test: revert khi giá trị ETH không đủ.
  - [x] Unit test: cancel listing chỉ seller/owner làm được.
  - [x] Test coverage ≥ 90% cho `Marketplace.sol`.

---

#### Task 1.6 — `CommunityTreasury.sol` & `Governance.sol` — DAO Fund & Voting

- **Objective**: Implement quỹ cộng đồng và cơ chế DAO voting để quyết định giải ngân bảo tồn.
- **Files**:
  - `src/CommunityTreasury.sol`
  - `src/Governance.sol`
  - `test/CommunityTreasury.t.sol`
  - `test/Governance.t.sol`
- **Details**:
  - **CommunityTreasury**: nhận ETH từ PaymentSplitter, chỉ Governance contract mới có thể gọi `disburse()`. Lưu lịch sử giải ngân.
  - **Governance**:
    - `propose()`: bất kỳ holder ECO Token nào cũng có thể đề xuất, cần minimum ECO balance (e.g., 100 ECO).
    - `vote(proposalId, bool support)`: mỗi địa chỉ vote 1 lần, weight = ECO balance tại thời điểm snapshot.
    - `execute(proposalId)`: chỉ execute khi `votesFor > votesAgainst` và deadline đã qua và quorum đạt (e.g., 10% total supply).
    - Voting period: configurable (default 7 ngày theo block time).
    - `execute()` gọi `CommunityTreasury.disburse()`.
  - Emit events: `ProposalCreated`, `VoteCast`, `ProposalExecuted`, `ProposalRejected`.
- **Definition of Done (DoD)**:
  - [x] Contract compile không warning.
  - [x] Unit test: Treasury nhận ETH từ PaymentSplitter, balance cập nhật đúng.
  - [x] Unit test: Treasury revert khi `disburse()` gọi từ non-Governance address.
  - [x] Unit test: tạo proposal thành công, revert khi ECO balance < threshold.
  - [x] Unit test: vote thành công, revert double-vote.
  - [x] Unit test: execute proposal khi điều kiện đạt (majority + quorum + deadline).
  - [x] Unit test: execute revert khi deadline chưa qua.
  - [x] Unit test: execute revert khi quorum không đạt.
  - [x] Tiền được giải ngân đúng địa chỉ recipient sau execute.
  - [x] Test coverage ≥ 90% cho cả 2 contracts.

---

### Phase 2 – Local Deployment & On-chain Verification

> **Goal**: Deploy toàn bộ contract lên Anvil local node, viết script tương tác bằng Cast, sau đó deploy lên Sepolia Testnet với verification trên Etherscan.

---

#### Task 2.1 — Deploy Scripts (Foundry Script)

- **Objective**: Viết Foundry deployment scripts có thể chạy trên cả local và testnet.
- **Files**:
  - `script/Deploy.s.sol` _(master deploy script)_
  - `script/DeployConfig.s.sol` _(network-specific config)_
  - `deployments/local.json` _(auto-generated, gitignored)_
  - `deployments/sepolia.json` _(auto-generated, gitignored)_
- **Details**:
  - `Deploy.s.sol`: deploy theo đúng thứ tự dependency: `EcoToken` → `ImpactBadge` → `CommunityTreasury` → `Governance` → `PaymentSplitter` → `Marketplace`.
  - Sau deploy, grant `MINTER_ROLE` cho `PaymentSplitter` và `Marketplace` trên `EcoToken` và `ImpactBadge`.
  - Set `Governance` là authorized caller của `CommunityTreasury`.
  - Lưu contract addresses vào `deployments/{network}.json`.
  - `Makefile` target: `make deploy-local` và `make deploy-sepolia`.
- **Definition of Done (DoD)**:
  - [x] `make deploy-local` chạy thành công trên Anvil node (port 8545).
  - [x] `deployments/local.json` được tạo với đầy đủ addresses.
  - [x] MINTER_ROLE được grant đúng cho PaymentSplitter và Marketplace.
  - [x] Governance được set là authorized caller của Treasury.
  - [x] Tất cả contracts verify trên Anvil bằng `cast call`.

---

#### Task 2.2 — Anvil Interaction Scripts (Cast)

- **Objective**: Viết shell scripts dùng `cast` để tương tác và kiểm tra luồng nghiệp vụ end-to-end trên local node.
- **Files**:
  - `script/interactions/01_create_listing.sh`
  - `script/interactions/02_purchase_listing.sh`
  - `script/interactions/03_check_balances.sh`
  - `script/interactions/04_create_proposal.sh`
  - `script/interactions/05_vote_and_execute.sh`
  - `Makefile` _(thêm targets: `make simulate-e2e`)_
- **Details**:
  - Script 01: Nghệ nhân (Anvil account #1) tạo listing tour 0.1 ETH.
  - Script 02: Du khách (Anvil account #2) mua listing → kiểm tra ETH đến artisan, Treasury, Platform.
  - Script 03: In ra balances: ECO Token của buyer, ImpactBadge tokenId, Treasury ETH balance.
  - Script 04: Du khách tạo proposal giải ngân 0.05 ETH cho dự án bảo tồn.
  - Script 05: 3 accounts vote `true`, chờ deadline (cheatcode `cast rpc evm_increaseTime`), execute proposal.
  - `make simulate-e2e` chạy tất cả scripts theo thứ tự.
- **Definition of Done (DoD)**:
  - [x] `make simulate-e2e` chạy hoàn chỉnh không có lỗi.
  - [x] Các balance thay đổi đúng như logic nghiệp vụ.
  - [x] ImpactBadge được mint đúng cho buyer.
  - [x] EcoToken được mint đúng cho buyer.
  - [x] Treasury nhận đúng Y%.
  - [x] Proposal được execute thành công, ETH chuyển đến recipient.

---

#### Task 2.3 — Sepolia Testnet Deployment & Etherscan Verification

- **Objective**: Deploy và verify tất cả contracts lên Sepolia Testnet, tạo public Etherscan links.
- **Files**:
  - `deployments/sepolia.json` _(auto-generated)_
  - `.env` _(SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY)_
  - `Makefile` _(target: `make verify-sepolia`)_
  - `docs/DEPLOYMENTS.md` _(contract addresses public record)_
- **Details**:
  - `make deploy-sepolia`: broadcast deploy script lên Sepolia RPC.
  - `make verify-sepolia`: chạy `forge verify-contract` cho từng contract với Etherscan API.
  - Cập nhật `docs/DEPLOYMENTS.md` với contract addresses và Etherscan links.
  - Test thực tế: tương tác với contracts trên Sepolia bằng `cast send` với real wallet.
- **Definition of Done (DoD)**:
  - [x] Tất cả 6 contracts được deploy thành công lên Sepolia.
  - [x] Tất cả contracts có verified source code trên Sepolia Etherscan.
  - [x] `docs/DEPLOYMENTS.md` đã cập nhật đầy đủ links.
  - [x] Ít nhất 1 giao dịch `purchaseListing` thành công trên Sepolia (dùng SepoliaETH).
  - [x] Treasury balance > 0 trên Sepolia sau giao dịch test.

---

### Phase 3 – AI Engine Integration & Digital Archive

> **Goal**: Tích hợp Gemini API cho AI Travel Assistant và xây dựng component lưu trữ di sản số 360° bằng Three.js.

---

#### Task 3.1 — Next.js Project Setup & Web3 Configuration

- **Objective**: Khởi tạo Next.js 14 project với đầy đủ dependencies và cấu hình Web3 providers.
- **Files**:
  - `package.json`
  - `next.config.ts`
  - `tailwind.config.ts`
  - `src/app/layout.tsx`
  - `src/providers/Web3Provider.tsx`
  - `src/providers/QueryProvider.tsx`
  - `src/config/wagmi.ts`
  - `src/config/contracts.ts` _(contract ABIs & addresses)_
  - `.env.local.example`
- **Details**:
  - `npx create-next-app` với TypeScript, Tailwind, App Router.
  - Cài đặt: `wagmi`, `viem`, `connectkit`, `@tanstack/react-query`, `three`, `@types/three`.
  - Cài đặt AI: `@google/generative-ai`.
  - `wagmi.ts`: cấu hình Sepolia chain + Anvil localnet, WalletConnect projectId.
  - `contracts.ts`: export ABIs (copy từ `out/` của Foundry) và addresses từ `deployments/sepolia.json`.
  - `Web3Provider.tsx`: wrap `WagmiProvider` + `ConnectKitProvider`.
  - `.env.local.example`: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `GEMINI_API_KEY`, `NEXT_PUBLIC_CHAIN_ID`.
- **Definition of Done (DoD)**:
  - [ ] `npm run dev` chạy thành công, không lỗi compile.
  - [ ] `npm run build` thành công.
  - [ ] ConnectKit modal mở được, kết nối MetaMask thành công.
  - [ ] Đọc được `useChainId()` hook trả về đúng chain (Sepolia/Anvil).
  - [ ] `contracts.ts` export đúng ABI của tất cả 6 contracts.

---

#### Task 3.2 — AI Travel Assistant (Gemini API - Edge Runtime)

- **Objective**: Xây dựng AI Travel Assistant endpoint và chat UI cho personalized itinerary và cultural guidance.
- **Files**:
  - `src/app/api/ai/chat/route.ts` _(Edge Runtime)_
  - `src/app/api/ai/itinerary/route.ts` _(Edge Runtime)_
  - `src/components/ai/TravelAssistant.tsx`
  - `src/components/ai/ChatBubble.tsx`
  - `src/components/ai/ItineraryCard.tsx`
  - `src/hooks/useAIChat.ts`
  - `src/lib/gemini.ts` _(Gemini client singleton)_
- **Details**:
  - `gemini.ts`: init `GoogleGenerativeAI` với API key, export `model` singleton (`gemini-pro`).
  - API Route `/api/ai/chat`:
    - Nhận `{ message, context: { destination, interests, carbonPreference } }`.
    - System prompt: "Bạn là AI Travel Assistant chuyên về du lịch sinh thái bền vững ở Việt Nam..."
    - Trả về streaming response (`ReadableStream`).
  - API Route `/api/ai/itinerary`:
    - Nhận `{ destination, days, interests }`.
    - Trả về JSON structured itinerary với carbon footprint estimate mỗi hoạt động.
  - `TravelAssistant.tsx`: chat UI với streaming text display, loading states.
  - `useAIChat.ts`: custom hook quản lý chat history và streaming.
- **Definition of Done (DoD)**:
  - [ ] Gọi API `/api/ai/chat` trả về streaming response.
  - [ ] Gọi API `/api/ai/itinerary` trả về structured JSON itinerary.
  - [ ] Chat UI hiển thị streaming text đúng (không flash/jump).
  - [ ] System prompt giữ đúng vai trò AI eco-tourism assistant.
  - [ ] Error handling: API key không hợp lệ → hiển thị lỗi thân thiện.
  - [ ] Mobile responsive layout.

---

#### Task 3.3 — Culture Guide & Language Learning Module

- **Objective**: Xây dựng module hướng dẫn văn hóa và học ngôn ngữ bản địa với AI.
- **Files**:
  - `src/app/api/ai/culture-guide/route.ts`
  - `src/components/culture/CultureGuideCard.tsx`
  - `src/components/culture/LanguageLearning.tsx`
  - `src/components/culture/DosDonts.tsx`
  - `src/data/culturalData.ts` _(static seed data)_
- **Details**:
  - API `/api/ai/culture-guide`: nhận `{ destination, context }`, trả về `{ dos, donts, phrases, customs }`.
  - `CultureGuideCard`: hiển thị phong tục địa phương, quy tắc ứng xử.
  - `DosDonts`: component hiển thị danh sách Nên/Không nên rõ ràng.
  - `LanguageLearning`: flash card component với audio (nếu available), học 10 câu bản địa phổ biến.
  - `culturalData.ts`: seed data cho các điểm đến demo (Hội An, Sa Pa, Phú Quốc).
- **Definition of Done (DoD)**:
  - [ ] AI tạo được culture guide cho ít nhất 3 điểm đến.
  - [ ] DosDonts hiển thị rõ ràng, dễ đọc.
  - [ ] Language Learning flash card hoạt động (flip animation).
  - [ ] Responsive trên mobile.

---

#### Task 3.4 — 360° Digital Heritage Archive (Three.js)

- **Objective**: Xây dựng component xem ảnh/video 360° cho di sản văn hóa số hóa.
- **Files**:
  - `src/components/archive/DigitalArchive360.tsx`
  - `src/components/archive/HotspotOverlay.tsx`
  - `src/components/archive/ArchiveGallery.tsx`
  - `src/hooks/useThreeScene.ts`
  - `src/lib/three-utils.ts`
  - `public/360/` _(sample 360° images — equirectangular)_
- **Details**:
  - `useThreeScene.ts`: khởi tạo Three.js scene, PerspectiveCamera, WebGLRenderer trong `useEffect`.
  - `DigitalArchive360.tsx`: Sphere geometry với `BackSide` material, texture từ equirectangular image.
  - Mouse/touch drag để xoay POV.
  - `HotspotOverlay.tsx`: các điểm annotation nổi trong không gian 3D (click để xem thông tin).
  - `ArchiveGallery.tsx`: danh sách di sản với thumbnail, click để vào xem 360°.
  - Sample assets: ít nhất 2 ảnh 360° demo (có thể dùng public domain).
- **Definition of Done (DoD)**:
  - [ ] Sphere 360° render đúng, không artifact.
  - [ ] Drag rotation mượt trên desktop (mouse).
  - [ ] Touch rotation hoạt động trên mobile.
  - [ ] Hotspot hiển thị và click được, popup thông tin.
  - [ ] Performance: FPS > 30 trên thiết bị trung bình.
  - [ ] Lazy load Three.js (dynamic import) để không ảnh hưởng First Load.

---

### Phase 4 – Next.js Web3 Frontend & D2C Marketplace

> **Goal**: Xây dựng toàn bộ UI tương tác với Smart Contracts: kết nối ví, mua hàng D2C, xem Carbon Tracker và claim NFT badges.

---

#### Task 4.1 — D2C Marketplace UI

- **Objective**: Xây dựng giao diện marketplace cho phép nghệ nhân list sản phẩm và du khách mua trực tiếp on-chain.
- **Files**:
  - `src/app/marketplace/page.tsx`
  - `src/app/marketplace/[listingId]/page.tsx`
  - `src/components/marketplace/ListingCard.tsx`
  - `src/components/marketplace/PurchaseButton.tsx`
  - `src/components/marketplace/CreateListingModal.tsx`
  - `src/hooks/useMarketplace.ts`
  - `src/hooks/usePaymentSplitter.ts`
- **Details**:
  - `useMarketplace.ts`: dùng `useReadContract` (Wagmi) để fetch active listings từ `Marketplace.sol`.
  - `ListingCard`: hiển thị ảnh sản phẩm (IPFS), tên, giá ETH, seller address (rút gọn), loại sản phẩm.
  - `PurchaseButton`: dùng `useWriteContract` để gọi `purchaseListing()`. Handle states: idle → pending → success/error. Toast notification.
  - `CreateListingModal`: form nhập product name, price, type, ảnh (upload IPFS via Pinata hoặc NFT.Storage). Submit gọi `createListing()`.
  - Payment split info: hiển thị breakout "70% → Nghệ nhân, 20% → Quỹ Cộng đồng, 10% → Nền tảng".
- **Definition of Done (DoD)**:
  - [ ] Listing hiển thị đầy đủ từ on-chain data.
  - [ ] Mua listing thành công trên Sepolia, transaction confirmed.
  - [ ] Toast "Purchase Successful!" + link Etherscan.
  - [ ] Tạo listing mới thành công (seller flow).
  - [ ] Hiển thị spinner trong khi transaction pending.
  - [ ] Error handling: ví không kết nối → redirect to ConnectKit.
  - [ ] Mobile responsive.

---

#### Task 4.2 — User Dashboard & NFT Badge Gallery

- **Objective**: Dashboard cá nhân hiển thị EcoToken balance, lịch sử giao dịch và bộ sưu tập ImpactBadge NFT.
- **Files**:
  - `src/app/dashboard/page.tsx`
  - `src/components/dashboard/TokenBalance.tsx`
  - `src/components/dashboard/BadgeGallery.tsx`
  - `src/components/dashboard/BadgeCard.tsx`
  - `src/components/dashboard/ActivityFeed.tsx`
  - `src/hooks/useUserBadges.ts`
  - `src/hooks/useEcoTokenBalance.ts`
- **Details**:
  - `useEcoTokenBalance.ts`: `useReadContract` đọc `balanceOf` từ `EcoToken.sol`.
  - `useUserBadges.ts`: `useReadContract` gọi `getBadgesByOwner()` từ `ImpactBadge.sol`, fetch metadata từ IPFS.
  - `BadgeGallery`: grid hiển thị NFT badges với animation flip.
  - `BadgeCard`: ảnh NFT, badge type, ngày mint, location.
  - `ActivityFeed`: parse events `PaymentSplit`, `BadgeMinted` từ `useContractEvents` (Wagmi).
  - `TokenBalance`: hiển thị ECO balance với animation counting up.
- **Definition of Done (DoD)**:
  - [ ] ECO Token balance hiển thị đúng.
  - [ ] Badges hiển thị đúng theo ví đang kết nối.
  - [ ] Metadata ảnh NFT load từ IPFS (có fallback skeleton).
  - [ ] Activity feed hiển thị ít nhất giao dịch gần nhất.
  - [ ] Dashboard update sau khi mua hàng (re-fetch).

---

#### Task 4.3 — Carbon Tracker UI

- **Objective**: Xây dựng Carbon Footprint Tracker cho phép du khách xem, tính toán và bù đắp phát thải chuyến đi.
- **Files**:
  - `src/app/carbon-tracker/page.tsx`
  - `src/components/carbon/CarbonCalculator.tsx`
  - `src/components/carbon/CarbonOffsetButton.tsx`
  - `src/components/carbon/CarbonMeter.tsx`
  - `src/app/api/carbon/calculate/route.ts`
  - `src/lib/carbon-utils.ts`
- **Details**:
  - `CarbonCalculator.tsx`: form nhập phương tiện (máy bay, xe máy, tàu), số km → tính kg CO₂.
  - `carbon-utils.ts`: hệ số phát thải theo loại phương tiện (có thể gọi AI để ước tính).
  - `CarbonMeter.tsx`: visual meter/gauge hiển thị mức phát thải (low/medium/high).
  - `CarbonOffsetButton.tsx`: khi user "offset", mint `ZERO_CARBON` ImpactBadge on-chain. Gọi `ImpactBadge.mintBadge()`.
  - API `/api/carbon/calculate`: tích hợp Gemini để ước tính carbon từ mô tả hành trình tự do.
  - Summary card: "Chuyến đi của bạn phát thải X kgCO₂. Đã được bù đắp bởi Y badges."
- **Definition of Done (DoD)**:
  - [ ] Calculator tính đúng CO₂ cho các phương tiện phổ biến.
  - [ ] Carbon Meter visual render đúng mức.
  - [ ] Click "Offset" → mint ZERO_CARBON badge trên Sepolia.
  - [ ] AI estimate hoạt động với free-text input.
  - [ ] Mobile responsive.

---

#### Task 4.4 — Eco Quest & Achievement System

- **Objective**: Gamification layer — du khách hoàn thành "Quests" để earn extra EcoToken và unlock rare badges.
- **Files**:
  - `src/app/quests/page.tsx`
  - `src/components/quests/QuestCard.tsx`
  - `src/components/quests/QuestProgress.tsx`
  - `src/data/quests.ts` _(quest definitions)_
  - `src/hooks/useQuestProgress.ts`
- **Details**:
  - `quests.ts`: define quests như: "Mua 3 sản phẩm thủ công", "Carbon offset lần đầu", "Tham gia vote DAO", "Xem 5 di sản 360°".
  - `useQuestProgress.ts`: track progress dựa trên on-chain events và local state.
  - `QuestCard`: progress bar, reward display (X ECO + badge type).
  - Khi quest hoàn thành: popup celebration + auto-claim reward (gọi contract).
  - Quest completion được lưu on-chain (thêm `QuestTracker` mapping vào `Governance.sol` hoặc contract riêng nếu cần).
- **Definition of Done (DoD)**:
  - [ ] Ít nhất 5 quests được define và hiển thị.
  - [ ] Progress tracking hoạt động đúng.
  - [ ] Quest completion popup animation.
  - [ ] Reward được claim on-chain (ECO mint).
  - [ ] Completed quests hiển thị check mark và không claim lại được.

---

### Phase 5 – Community Governance DAO UI & End-to-End Testing

> **Goal**: Xây dựng DAO voting interface hoàn chỉnh, viết integration tests end-to-end và deploy lên Vercel.

---

#### Task 5.1 — Community DAO Governance UI

- **Objective**: Xây dựng interface cho phép cộng đồng tạo proposals, vote và theo dõi quyết định giải ngân.
- **Files**:
  - `src/app/governance/page.tsx`
  - `src/app/governance/[proposalId]/page.tsx`
  - `src/components/governance/ProposalCard.tsx`
  - `src/components/governance/VoteButtons.tsx`
  - `src/components/governance/CreateProposalModal.tsx`
  - `src/components/governance/TreasuryStats.tsx`
  - `src/hooks/useGovernance.ts`
  - `src/hooks/useTreasury.ts`
- **Details**:
  - `TreasuryStats.tsx`: hiển thị total balance Treasury, total disbursed, số proposals active.
  - `ProposalCard`: tên dự án bảo tồn, số ETH yêu cầu, progress bar votesFor vs votesAgainst, deadline countdown.
  - `VoteButtons`: "Vote For 👍" và "Vote Against 👎", gọi `Governance.vote()`. Disable sau khi đã vote.
  - `CreateProposalModal`: form nhập tên dự án, mô tả, số ETH yêu cầu, địa chỉ nhận. Validate ECO balance ≥ threshold.
  - `useGovernance.ts`: fetch proposals, vote status của user hiện tại.
  - Execute button: hiện khi proposal passed + deadline qua → gọi `Governance.execute()`.
- **Definition of Done (DoD)**:
  - [ ] Danh sách proposals hiển thị từ on-chain data.
  - [ ] Vote thành công trên Sepolia.
  - [ ] Double-vote revert + hiển thị lỗi thân thiện "Bạn đã vote rồi".
  - [ ] Tạo proposal thành công (require ECO balance).
  - [ ] Execute proposal UI hoạt động sau deadline.
  - [ ] Treasury stats cập nhật sau giải ngân.
  - [ ] Mobile responsive.

---

#### Task 5.2 — Full Integration Test Suite (Playwright)

- **Objective**: Viết end-to-end integration tests tự động cover các user journeys quan trọng.
- **Files**:
  - `e2e/playwright.config.ts`
  - `e2e/tests/01_wallet_connect.spec.ts`
  - `e2e/tests/02_marketplace_purchase.spec.ts`
  - `e2e/tests/03_carbon_offset.spec.ts`
  - `e2e/tests/04_governance_vote.spec.ts`
  - `e2e/tests/05_dashboard_badges.spec.ts`
  - `e2e/fixtures/anvil.fixture.ts` _(fork Anvil state)_
- **Details**:
  - Dùng **Playwright** + Anvil local fork để test on-chain interactions.
  - Test 01: Kết nối MetaMask (mock wallet) → header hiển thị địa chỉ rút gọn.
  - Test 02: Browse marketplace → mua listing → toast success → badge xuất hiện trên dashboard.
  - Test 03: Nhập hành trình → calculate carbon → click offset → ZERO_CARBON badge mint.
  - Test 04: Tạo proposal → vote → time travel (Anvil) → execute → Treasury balance giảm.
  - Test 05: Dashboard hiển thị đúng ECO balance + badge gallery sau các actions.
- **Definition of Done (DoD)**:
  - [ ] Tất cả 5 test suites pass.
  - [ ] CI pipeline chạy tests tự động (GitHub Actions).
  - [ ] Coverage report được generate.
  - [ ] Không có flaky tests (retry ≤ 1 lần).

---

#### Task 5.3 — Performance, Accessibility & SEO Audit

- **Objective**: Đảm bảo ứng dụng đạt chuẩn performance, accessibility và SEO trước khi deploy production.
- **Files**:
  - `src/app/layout.tsx` _(metadata, OpenGraph)_
  - `next.config.ts` _(image optimization, headers)_
  - `public/sitemap.xml`
  - `docs/AUDIT_REPORT.md`
- **Details**:
  - Chạy Lighthouse audit: nhắm Score ≥ 90 cho Performance, Accessibility, SEO.
  - Cấu hình `next/image` cho tất cả ảnh (IPFS images dùng `loader`).
  - OpenGraph metadata cho tất cả pages chính.
  - Thêm `aria-label` cho interactive elements.
  - Dynamic import Three.js và AI components để giảm First Load JS.
  - Cấu hình `next.config.ts` headers: CSP, X-Frame-Options.
- **Definition of Done (DoD)**:
  - [ ] Lighthouse Performance ≥ 85.
  - [ ] Lighthouse Accessibility ≥ 90.
  - [ ] Lighthouse SEO ≥ 90.
  - [ ] No broken images trên production build.
  - [ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1, FID < 100ms.

---

#### Task 5.4 — Vercel Production Deployment

- **Objective**: Deploy Next.js application lên Vercel với đầy đủ environment variables và custom domain.
- **Files**:
  - `vercel.json`
  - `.github/workflows/deploy.yml`
  - `docs/DEPLOYMENTS.md` _(cập nhật Vercel URL)_
- **Details**:
  - Connect GitHub repo với Vercel project.
  - Set environment variables trên Vercel dashboard: `GEMINI_API_KEY`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_CHAIN_ID=11155111`.
  - `vercel.json`: cấu hình redirects, headers, regions.
  - GitHub Actions workflow: `on: push main` → run Foundry tests → run E2E tests → deploy Vercel.
  - Preview deployments cho mọi PR.
  - Cập nhật `docs/DEPLOYMENTS.md` với production URL.
- **Definition of Done (DoD)**:
  - [ ] App live trên Vercel URL (https://\*.vercel.app).
  - [ ] Tất cả env vars được set đúng trên Vercel.
  - [ ] GitHub Actions CI/CD pipeline pass.
  - [ ] Preview deploy hoạt động cho PR mới.
  - [ ] Kết nối MetaMask trên Sepolia thành công từ production URL.
  - [ ] Ít nhất 1 giao dịch on-chain thành công từ production app.

---

## 5. Tech Stack Reference

| Layer              | Technology                           | Version             | Purpose                       |
| ------------------ | ------------------------------------ | ------------------- | ----------------------------- |
| Smart Contracts    | Solidity                             | `^0.8.24`           | Business logic on-chain       |
| Contract Framework | Foundry (Forge/Cast/Anvil)           | latest              | Build, test, deploy contracts |
| Contract Libraries | OpenZeppelin                         | `^5.0`              | Secure ERC standards          |
| Frontend           | Next.js                              | `14.x` (App Router) | Full-stack React framework    |
| Language           | TypeScript                           | `^5.0`              | Type safety                   |
| Styling            | Tailwind CSS                         | `^3.4`              | Utility-first CSS             |
| 3D Rendering       | Three.js                             | `^0.165`            | 360° Digital Archive          |
| Web3 Client        | Wagmi                                | `v2.x`              | React hooks for Ethereum      |
| Web3 Low-level     | Viem                                 | `^2.x`              | TypeScript Ethereum client    |
| Wallet UI          | ConnectKit                           | `^1.8`              | Wallet connection modal       |
| Data Fetching      | @tanstack/react-query                | `^5.x`              | Server state management       |
| AI Engine          | Gemini API (`@google/generative-ai`) | latest              | AI Travel Assistant           |
| Network (Local)    | Anvil                                | —                   | Local Ethereum node           |
| Network (Test)     | Sepolia Testnet                      | Chain ID: 11155111  | Pre-production testing        |
| E2E Testing        | Playwright                           | `^1.45`             | Browser automation tests      |
| CI/CD              | GitHub Actions                       | —                   | Automated pipeline            |
| Hosting            | Vercel                               | —                   | Production deployment         |
| IPFS               | Pinata / NFT.Storage                 | —                   | Decentralized asset storage   |

---

## 6. Risk & Dependency Map

### Critical Dependencies (Must be done in order)

```
Task 1.1 (Foundry Setup)
    └── Task 1.2 (EcoToken)
    └── Task 1.3 (ImpactBadge)
    └── Task 1.4 (PaymentSplitter) → requires 1.2, 1.3
    └── Task 1.5 (Marketplace)     → requires 1.4
    └── Task 1.6 (Treasury + DAO)  → requires 1.2
        └── Task 2.1 (Deploy Scripts) → requires ALL Phase 1
            └── Task 2.2 (Cast Scripts)
            └── Task 2.3 (Sepolia Deploy)
                └── Task 3.1 (Next.js Setup)
                    ├── Task 3.2 (AI Assistant) → parallel
                    ├── Task 3.3 (Culture Guide) → parallel
                    └── Task 3.4 (360° Archive) → parallel
                        └── Task 4.1 (Marketplace UI) → requires 3.1
                        └── Task 4.2 (Dashboard)      → requires 3.1
                        └── Task 4.3 (Carbon Tracker) → requires 3.1, 3.2
                        └── Task 4.4 (Quests)         → requires 4.1, 4.2
                            └── Task 5.1 (DAO UI)     → requires all Phase 4
                            └── Task 5.2 (E2E Tests)  → requires all Phase 4
                            └── Task 5.3 (Audit)      → requires 5.2
                                └── Task 5.4 (Deploy) → requires 5.3
```

### Risk Register

| Risk                                   | Impact   | Probability | Mitigation                                 |
| -------------------------------------- | -------- | ----------- | ------------------------------------------ |
| Gemini API rate limit                  | Medium   | Medium      | Caching layer + fallback to OpenAI         |
| IPFS upload latency                    | Low      | High        | Pinata pinning + local fallback            |
| Reentrancy attack trên PaymentSplitter | Critical | Low         | ReentrancyGuard + Pull pattern             |
| Wallet incompatibility                 | Medium   | Low         | Test với MetaMask, Coinbase, WalletConnect |
| Sepolia ETH faucet limit               | Low      | Medium      | Dùng nhiều faucets (Alchemy, Chainlink)    |
| Three.js performance trên mobile       | Medium   | Medium      | LOD + dynamic import + fallback static     |
| DAO quorum không đạt                   | Low      | High        | Configurable quorum thấp cho testnet       |

---

> **Next Step**: Bắt đầu với **Task 1.1 – Foundry Project Setup**. Chạy lệnh:
>
> ```bash
> forge init contracts && cd contracts && forge install OpenZeppelin/openzeppelin-contracts
> ```

---

_Document maintained by: AI Architect (Planner) · MyHomeLab Project · Dely Dev Process v1.0_
