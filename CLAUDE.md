# CLAUDE.md — MyHomeLab (Regenerative Digital Eco-Tourism)

Tài liệu định hướng cho Claude Code (và lập trình viên mới) khi làm việc trong repo này.
Mô tả nghiệp vụ chi tiết nằm ở [README.md](README.md), [docs/PLAN.md](docs/PLAN.md),
địa chỉ đã deploy ở [docs/DEPLOYMENTS.md](docs/DEPLOYMENTS.md), báo cáo audit Lighthouse
(hiệu năng, accessibility, SEO) ở [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md).
Smart contract **chưa** được audit bảo mật bởi bên thứ ba.

---

## 1. Tổng quan repo

```
HomeLab/
├── contracts/            # Foundry: Solidity 0.8.24, OpenZeppelin (git submodule)
│   ├── src/              # 8 contracts + interfaces/IMarketPlaceDeps.sol
│   ├── script/           # Deploy.s.sol (master), DeployCarbonOffset, DeployQuestRewards,
│   │                     # QuestSetup.sol (6 quest mặc định), interactions/*.sh (E2E bằng cast)
│   ├── test/             # forge test (unit + MarketplaceIntegration)
│   ├── deployments/      # local.json / sepolia.json do Deploy.s.sol ghi ra
│   └── Makefile          # build, test, deploy-local, deploy-sepolia, simulate-e2e...
├── frontend/             # Next.js 14 App Router, TypeScript, Tailwind, wagmi v2 + viem, ConnectKit, Three.js
│   ├── src/app/api/      # Route handlers: ai/chat, ai/itinerary, ai/culture-guide, carbon/calculate (Edge), ipfs/metadata (Node)
│   ├── src/lib/          # gemini.ts, api.ts, ai-validation.ts, rate-limit.ts, sse.ts, ...
│   ├── src/hooks/        # useMarketplace, useGovernance, useCarbonOffset, useQuestProgress, useAIChat...
│   ├── src/config/       # contracts.ts (địa chỉ + ABI theo chain), wagmi.ts
│   ├── src/abis/         # ABI JSON copy từ contracts/out/ (định dạng artifact Foundry: { "abi": [...] })
│   ├── test/             # unit test Node (node --test, *.test.mjs)
│   └── e2e/              # Playwright + Anvil (global-setup tự deploy contracts)
├── .github/workflows/    # ci.yml (forge test, typecheck, lint, unit, e2e) · deploy.yml (Vercel)
└── docs/
```

**Chain hỗ trợ:** Sepolia (`11155111`) và Anvil (`31337`). Chain mặc định lấy từ
`NEXT_PUBLIC_CHAIN_ID`, fallback Sepolia.

---

## 2. Smart Contracts

### 2.1 Danh sách contract

| Contract | Kế thừa | Vai trò |
| --- | --- | --- |
| `EcoToken` | ERC20, Capped (100M), Burnable, Permit, **Votes**, AccessControl, Ownable | Token thưởng + voting power (cần `delegate()` mới có phiếu) |
| `ImpactBadge` | ERC721, URIStorage, AccessControl | NFT Proof-of-Action: `ECO_CHECKIN`, `ZERO_CARBON`, `CULTURE_GUARDIAN`, `COMMUNITY_DONOR` |
| `PaymentSplitter` | Ownable, ReentrancyGuard | Chia tiền 70/20/10 (BPS), mint ECO cho người mua, phí platform theo pull-pattern |
| `Marketplace` | Ownable, ReentrancyGuard | Tạo/mua/huỷ listing D2C, hoàn tiền thừa |
| `CommunityTreasury` | Ownable, ReentrancyGuard | Giữ ETH cộng đồng; **chỉ Governance** gọi được `disburse()` |
| `Governance` | Ownable2Step, ReentrancyGuard | DAO: `propose` → voting delay → `vote` → timelock → `execute` (guardian có thể `cancel`) |
| `CarbonOffset` | Ownable, ReentrancyGuard | Trả phí bù CO₂ → Treasury, mint badge `ZERO_CARBON` |
| `QuestRewards` | Ownable, ReentrancyGuard | Kiểm tra điều kiện quest (badge / offset / vote DAO) → thưởng ECO + badge |

### 2.2 Sơ đồ tương tác & phân quyền

```mermaid
flowchart LR
    %% Actors
    Buyer([👤 Du khách / Buyer])
    Artisan([🧑‍🎨 Nghệ nhân / Seller])
    Holder([🗳️ ECO Holder])
    Owner([🔑 Deployer / Owner])

    subgraph Core["Contracts"]
        MP[Marketplace]
        PS[PaymentSplitter]
        ECO[(EcoToken<br/>ERC20Votes)]
        IB[(ImpactBadge<br/>ERC721)]
        TR[CommunityTreasury]
        GOV[Governance]
        CO[CarbonOffset]
        QR[QuestRewards]
    end

    Artisan -- "createListing(price, pType, uri)" --> MP
    Buyer -- "purchaseListing(id) + ETH" --> MP
    MP -- "splitPayment{value}(seller, buyer, pType)" --> PS
    MP -- "mint(buyer, pType)" --> IB
    MP -. "hoàn ETH thừa" .-> Buyer

    PS -- "70% ETH" --> Artisan
    PS -- "deposit{20%}()" --> TR
    PS -- "mint(buyer, value × ecoRewardRate)" --> ECO
    PS -. "10% pendingPlatformFees<br/>withdrawPlatformFees()" .-> Owner

    Buyer -- "offset(grams, uri) + ETH" --> CO
    CO -- "deposit{fee}()" --> TR
    CO -- "mintBadge(ZERO_CARBON)" --> IB

    Holder -- "delegate(self)" --> ECO
    Holder -- "propose / vote / execute" --> GOV
    GOV -- "balanceOf / getPastVotes /<br/>getPastTotalSupply" --> ECO
    GOV -- "disburse(id, recipient, amount)" --> TR

    Buyer -- "claim(questId, proofIds)" --> QR
    QR -- "getBadge(id)" --> IB
    QR -- "offsetCountOf / offsetGramsOf" --> CO
    QR -- "hasVoted(id, user)" --> GOV
    QR -- "mint(ECO)" --> ECO
    QR -- "mintBadge(type, uri)" --> IB
```

**Quyền được cấp trong `Deploy.s.sol` (broadcast block 2):**

```mermaid
flowchart TB
    subgraph ECO_ROLES["EcoToken.MINTER_ROLE"]
        e1[PaymentSplitter]
        e3[QuestRewards]
    end
    subgraph IB_ROLES["ImpactBadge.MINTER_ROLE"]
        b1[Marketplace]
        b3[CarbonOffset]
        b4[QuestRewards]
    end
    subgraph TR_GOV["CommunityTreasury.setGovernance"]
        g1[Governance]
    end
    Deployer([Deployer = DEFAULT_ADMIN + owner]) --> ECO_ROLES
    Deployer --> IB_ROLES
    Deployer --> TR_GOV
```

> Khi deploy lại một contract riêng lẻ (ví dụ `DeployCarbonOffset.s.sol`,
> `DeployQuestRewards.s.sol`) **phải** cấp lại `MINTER_ROLE` tương ứng — các script
> riêng đã làm việc này, script tự viết thì nhớ thêm.

### 2.3 Luồng mua hàng (sequence)

```mermaid
sequenceDiagram
    autonumber
    actor B as Buyer
    participant MP as Marketplace
    participant PS as PaymentSplitter
    participant TR as CommunityTreasury
    participant ECO as EcoToken
    participant IB as ImpactBadge
    actor A as Artisan

    B->>MP: purchaseListing(listingId) {value ≥ price}
    MP->>MP: Checks + đánh dấu listing đã bán (CEI)
    MP->>PS: splitPayment{value: price}(seller, buyer, pType)
    PS->>PS: pendingPlatformFees += 10% (+ phần dư làm tròn)
    PS->>A: call{value: 70%}
    PS->>TR: deposit{value: 20%}() → emit FundsReceived
    PS->>ECO: mint(buyer, price × ecoRewardRate / 1e18)
    PS-->>MP: emit PaymentSplit
    MP->>IB: mint(buyer, pType)
    Note right of IB: Handicraft→ECO_CHECKIN<br/>Food→CULTURE_GUARDIAN<br/>Experience→CULTURE_GUARDIAN
    MP-->>B: hoàn ETH thừa (nếu có) · emit ListingPurchased
```

### 2.4 Luồng DAO Governance

```mermaid
sequenceDiagram
    autonumber
    actor H as ECO Holder
    participant ECO as EcoToken (Votes)
    participant G as Governance
    participant T as CommunityTreasury
    actor R as Recipient

    H->>ECO: delegate(H)  (bắt buộc, nếu không weight = 0)
    H->>G: propose(recipient, amount, description)
    G->>ECO: balanceOf(H) ≥ proposalThreshold?
    G->>ECO: getPastTotalSupply(block.number-1) × quorumBps
    G-->>H: proposalId (snapshotBlock, deadline = now + votingPeriod)
    H->>G: vote(proposalId, support)
    G->>ECO: getPastVotes(H, snapshotBlock)
    Note over G: Chờ hết votingPeriod
    H->>G: execute(proposalId)
    alt totalVotes < quorumVotes
        G-->>H: revert QuorumNotReached
    else votesFor > votesAgainst
        G->>T: disburse(proposalId, recipient, amount)
        T->>R: call{value: amount}
    else
        G-->>H: emit ProposalRejected
    end
```

### 2.5 Tham số theo mạng

| Tham số | Anvil (31337) | Sepolia — mặc định `Deploy.s.sol` | Sepolia — on-chain hiện tại |
| --- | --- | --- | --- |
| Chia tiền artisan/treasury/platform | 7000 / 2000 / 1000 BPS | như Anvil | như Anvil |
| `ecoRewardRate` | 100 ECO / 1 ETH | như Anvil | như Anvil |
| `proposalThreshold` | 1 ECO | 100 ECO | 100 ECO |
| `quorumBps` | 100 (1%) | 500 (5%) | 500 (5%) |
| `votingPeriod` | 1 giờ (tối thiểu cho phép) | 3 ngày | 3 ngày |
| `CarbonOffset.pricePerKgWei` | 0.00001 ETH/kg | như Anvil (đổi qua `CARBON_PRICE_PER_KG_WEI`) | 0.00001 ETH/kg |

Owner có thể đổi 3 tham số DAO bằng `setProposalThreshold` / `setQuorumBps` / `setVotingPeriod`, nên giá trị
on-chain có thể khác mặc định của script. Kiểm tra trước khi dựa vào chúng (đọc lần cuối: 2026-11-10):

```bash
cast call 0x43c32746284cE1294Df74128eE53adbB8e464Ebf "quorumBps()(uint256)" --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

Thứ tự deploy (quan trọng vì địa chỉ Anvil là **tất định** theo nonce của account #0 và đã
hard-code trong [frontend/src/config/contracts.ts](frontend/src/config/contracts.ts)):
`EcoToken → ImpactBadge → CommunityTreasury → Governance → PaymentSplitter → Marketplace → CarbonOffset → QuestRewards`.
Đổi thứ tự hoặc thêm transaction trước đó ⇒ phải cập nhật lại địa chỉ Anvil trong `contracts.ts`
(E2E `global-setup.ts` sẽ fail nếu lệch).

---

## 3. Luồng xử lý nghiệp vụ

Mục này mô tả từng nghiệp vụ end-to-end: người dùng làm gì trên UI, frontend gọi gì, contract kiểm tra
điều kiện nào và kết quả ghi on-chain ra sao. Tên lỗi là custom error thật trong contract.

### 3.1 Bản đồ nghiệp vụ tổng thể

```mermaid
flowchart LR
    A["🔍 Khám phá<br/>AI chat · lịch trình · văn hoá · 360°"] --> B["🛒 Mua sản phẩm D2C<br/>/marketplace"]
    B --> C["💸 Chia tiền 70/20/10<br/>+ thưởng ECO + badge"]
    A --> D["🌍 Tính & bù CO₂<br/>/carbon-tracker"]
    D --> E["Phí vào Quỹ<br/>+ badge ZERO_CARBON"]
    C --> F["🎯 Eco Quest<br/>/quests"]
    E --> F
    C --> G["🗳️ DAO<br/>/governance"]
    F --> G
    G --> H["Giải ngân Quỹ<br/>cho dự án bảo tồn"]
    C & E & F & G --> I["📊 Dashboard<br/>ECO · badge · activity"]
```

| Nghiệp vụ | Trang | Hook / component | Contract |
| --- | --- | --- | --- |
| Đăng bán | `/marketplace` | `CreateListingModal` → `/api/ipfs/metadata` | `Marketplace.createListing` |
| Mua hàng | `/marketplace/[listingId]` | `PurchaseButton`, `useMarketplace` | `Marketplace.purchaseListing` |
| Huỷ listing | `/marketplace/[listingId]` | `PurchaseButton` (hiện cho seller) | `Marketplace.cancelListing` |
| Đơn hàng & Lịch đặt | `/dashboard?tab=orders`, `/marketplace/[listingId]` | `MyOrders`, `OrderPanel` (`OrderProgress`, `OrderActions` + `ConfirmDialog`, `OrderContact`), `useMyOrders` | `Marketplace.confirmDelivery` / `openDispute` / `refundBuyer` / `releaseAfterTimeout` / `resolveDispute` |
| Bù carbon | `/carbon-tracker` | `CarbonCalculator`, `CarbonOffsetButton`, `useCarbonOffset` | `CarbonOffset.offset` |
| Quest | `/quests` | `useQuestProgress`, `lib/quests.ts` | `QuestRewards.claim` |
| DAO | `/governance`, `/governance/[proposalId]` | `useGovernance`, `VotingPowerPanel`, `VoteButtons`, `ExecuteProposalButton` | `EcoToken.delegate`, `Governance.*` |
| Dashboard | `/dashboard` | `useEcoTokenBalance`, `useUserBadges`, `useActivityFeed` | đọc state + event |

Mọi giao dịch ghi đi qua hook `useContractTx`: trạng thái `awaiting-wallet` → chờ xác nhận on-chain → toast,
thông báo lỗi thân thiện và tự làm mới các lệnh đọc on-chain.

### 3.2 Nghệ nhân đăng bán sản phẩm

```mermaid
sequenceDiagram
    autonumber
    actor S as Nghệ nhân
    participant UI as CreateListingModal
    participant API as /api/ipfs/metadata (Node)
    participant P as Pinata IPFS
    participant MP as Marketplace

    S->>UI: Nhập tên, mô tả, giá (ETH), loại, ảnh (≤ 2 MB)
    UI->>API: POST multipart
    API->>API: rate limit 10 req/phút/IP · kiểm tra kích thước · PINATA_JWT?
    alt Chưa cấu hình PINATA_JWT
        API-->>UI: 503 IPFS_DISABLED
    else OK
        API->>P: pin ảnh + metadata JSON
        P-->>API: CID
        API-->>UI: ipfs://CID
    end
    UI->>MP: createListing(price, pType, metadataURI)
    MP->>MP: price > 0 (ZeroPrice) · URI khác rỗng (EmptyMetadataURI)
    MP-->>S: listingId = nextListingId++ · emit ListingCreated
```

- `ProductType`: `Handicraft` (0), `Food` (1), `Experience` (2) — quyết định loại badge người mua nhận.
- Chỉ ví được owner xác thực (`setArtisanVerified`) mới tạo được listing (`ArtisanNotVerified`); giá tối thiểu
  `minListingPrice`, mặc định 0.001 ETH (`PriceBelowMinimum`). Trên Anvil, `Deploy.s.sol` tắt yêu cầu xác thực.
- Không tự mua listing của mình (`SelfPurchase`). `PaymentSplitter` chỉ thưởng ECO khi Marketplace gọi.
- Huỷ: chỉ seller hoặc owner của Marketplace (`NotSellerOrOwner`), listing phải còn active.

### 3.3 Du khách mua hàng

Trạng thái của một listing:

```mermaid
stateDiagram-v2
    [*] --> Active: createListing
    Active --> Sold: purchaseListing (isActive = false)
    Active --> Cancelled: cancelListing (seller / owner)
    Sold --> [*]
    Cancelled --> [*]
```

**Escrow:** `purchaseListing` chỉ giữ tiền trong Marketplace (trạng thái `Paid`). Tiền được chia, ECO và badge được phát
khi `confirmDelivery` (người mua), `releaseAfterTimeout` (ai cũng gọi được sau `escrowPeriod`, mặc định 14 ngày) hoặc
`resolveDispute(id, false)` (arbiter). Hoàn tiền: `refundBuyer` (người bán), `resolveDispute(id, true)`, `refundStaleDispute`
(tranh chấp quá 60 ngày). Mục 2.3 và các bước 3–5 dưới đây xảy ra tại thời điểm giải ngân, không phải lúc mua.

Quy tắc khi gọi `purchaseListing(listingId)` (sequence chi tiết ở mục 2.3):

1. `ListingNotFound` nếu chưa có seller · `ListingNotActive` nếu đã bán/huỷ · `InsufficientPayment` nếu `msg.value < price`.
2. Đánh dấu `isActive = false` **trước** mọi external call (mỗi listing chỉ bán một lần).
3. `PaymentSplitter` chia `price`: nghệ nhân `price × 7000 / 10000`, Quỹ `price × 2000 / 10000`, phần còn lại
   (gồm dư làm tròn) cộng vào `pendingPlatformFees`; mint `price × ecoRewardRate / 1e18` ECO cho người mua.
4. `ImpactBadge.mint(buyer, pType)`: Handicraft → `ECO_CHECKIN`, Food → `CULTURE_GUARDIAN`, Experience → `CULTURE_GUARDIAN`.
5. Hoàn `msg.value − price` cho người mua.

**Ví dụ 0.1 ETH:** nghệ nhân 0.07 · Quỹ 0.02 · platform 0.01 · người mua nhận **10 ECO** + 1 badge.
Owner rút phí platform bằng `withdrawPlatformFees(to)`; đổi tỷ lệ bằng `setShares` (tổng = 10 000, nghệ nhân ≥ 50%, phí nền tảng ≤ 20%).

### 3.4 Tính và bù đắp carbon

```mermaid
sequenceDiagram
    autonumber
    actor U as Du khách
    participant C as CarbonCalculator
    participant AI as /api/carbon/calculate (Edge)
    participant CO as CarbonOffset
    participant T as CommunityTreasury
    participant IB as ImpactBadge

    alt Nhập từng chặng
        U->>C: chặng (phương tiện, km, số khách)
        C->>C: calculateTrip() theo hệ số trong lib/carbon-utils.ts
    else Mô tả tự do
        U->>C: mô tả hành trình
        C->>AI: POST {description}
        AI-->>C: {totalKgCO2, breakdown, level, offsetSuggestions}
    end
    C->>C: kgToGrams() (làm tròn lên) · mức low < 50 kg ≤ medium < 200 kg ≤ high
    C->>CO: đọc pricePerKgWei → phí = ceil(grams × price / 1000)
    U->>CO: offset(grams, metadataURI) {value: phí}
    CO->>CO: 0 < grams ≤ 100 000 000 · URI ≤ 2048 ký tự · đủ tiền
    CO->>CO: offsetGramsOf += grams · offsetCountOf += 1
    CO->>T: deposit{value: phí}
    CO->>IB: mintBadge(user, ZERO_CARBON, metadataURI)
    CO-->>U: hoàn tiền thừa · emit CarbonOffsetted
```

- `metadataURI` của badge bù carbon là **data URI JSON** (`buildOffsetMetadataUri`), không đi qua IPFS;
  mô tả bị cắt dần để URI không vượt 2048 ký tự. URI rỗng ⇒ contract dùng `DEFAULT_METADATA_URI`.
- **Toàn bộ** phí bù đắp vào Quỹ Cộng đồng (không chia 70/20/10, không thưởng ECO).
- Ví dụ: 100 kg CO₂ × 0.00001 ETH/kg = **0.001 ETH**.

### 3.5 Eco Quest

`claim(questId, proofIds)` kiểm tra: quest tồn tại (`QuestNotFound`), đang active (`QuestInactive`), ví chưa nhận
(`AlreadyCompleted`), tối đa 50 proof (`TooManyProofIds`), rồi đạt điều kiện (`RequirementNotMet`).
Sau đó đánh dấu hoàn thành, mint ECO và/hoặc badge thưởng.

```mermaid
flowchart TD
    Start["claim(questId, proofIds)"] --> Q{requirement}
    Q -->|BADGES_OF_TYPE| B["proofIds tăng dần nghiêm ngặt, đủ target;<br/>mỗi badge: recipient = user & đúng proofBadgeType"]
    Q -->|OFFSET_COUNT| OC["CarbonOffset.offsetCountOf(user) ≥ target"]
    Q -->|OFFSET_GRAMS| OG["CarbonOffset.offsetGramsOf(user) ≥ target"]
    Q -->|DAO_VOTE| DV["proofIds = [proposalId] &<br/>Governance.hasVoted(proposalId, user)"]
    Q -->|SELF_ATTESTED| SA["luôn đúng"]
    B & OC & OG & DV & SA --> R["isCompleted = true → mint ECO / badge"]
```

6 quest mặc định (`script/QuestSetup.sol`, thứ tự = `questId`, **phải khớp** `frontend/src/data/quests.ts`):

| ID | Nhiệm vụ | Điều kiện | Thưởng |
| --- | --- | --- | --- |
| 0 | Mua sản phẩm thủ công đầu tiên | 1 badge `ECO_CHECKIN` | 10 ECO |
| 1 | Mua 3 sản phẩm thủ công | 3 badge `ECO_CHECKIN` | 30 ECO + `CULTURE_GUARDIAN` |
| 2 | Bù carbon lần đầu | `offsetCountOf ≥ 1` | chỉ `COMMUNITY_DONOR` |
| 3 | Bù tổng ≥ 100 kg CO₂ | `offsetGramsOf ≥ 100 000` | chỉ `ZERO_CARBON` |
| 4 | Tham gia vote DAO | `hasVoted(proposalId)` | chỉ `COMMUNITY_DONOR` |
| 5 | Xem di sản 360° | tự khai báo (off-chain) | chỉ `CULTURE_GUARDIAN` |

Ràng buộc khi `addQuest` (chống tự tạo bằng chứng): quest đếm số phải có `target > 0`; chỉ `BADGES_OF_TYPE` mới
được thưởng ECO; phải có ít nhất một loại thưởng; không thưởng đúng loại badge dùng làm bằng chứng; không bao giờ
thưởng `ECO_CHECKIN`. Frontend (`useQuestProgress`) tự tìm `proofIds` bằng `getBadgesByOwner` + `getBadge`.

### 3.6 Quản trị DAO và giải ngân Quỹ

Trạng thái một proposal (sequence chi tiết ở mục 2.4):

```mermaid
stateDiagram-v2
    [*] --> Active: propose (balance ≥ threshold)
    Active --> Active: vote (trước deadline, mỗi ví 1 lần)
    Active --> Ended: block.timestamp ≥ deadline
    Ended --> Ended: execute khi chưa đủ quorum → revert QuorumNotReached
    Ended --> Executed: execute, đủ quorum & For > Against → Treasury.disburse
    Ended --> Rejected: execute, đủ quorum & For ≤ Against
    Executed --> [*]
    Rejected --> [*]
```

- **Ngưỡng tạo proposal** tính theo `balanceOf` hiện tại, còn **trọng số phiếu** theo `getPastVotes` tại
  `snapshotBlock = block.number − 1` ⇒ phải `delegate` **trước** khi proposal được tạo, nếu không `NoVotingPower`.
- `quorumVotes = getPastTotalSupply(snapshot) × quorumBps / 10 000`, tính và lưu lúc propose.
- `snapshotBlock = block.number − 1 + votingDelayBlocks`: holder còn thời gian delegate sau khi đề xuất được tạo.
- Đề xuất thông qua chỉ giải ngân trong `[executeAfter, executeAfter + 14 ngày]` (`TimelockNotElapsed`,
  `ProposalExpired`), mỗi đề xuất tối đa `maxDisbursementBps` số dư Quỹ (`ExceedsDisbursementCap`); `guardian` có thể `cancel`.
- Mặc định 7.200 block / 2 ngày / 20%. Trên Anvil, `Deploy.s.sol` đặt 0 / 0 / 100%.
- Phiếu chống cũng tính vào quorum. Hoà phiếu ⇒ Rejected.
- `execute` ai gọi cũng được sau deadline; `Treasury.disburse` revert `InsufficientBalance` nếu quỹ không đủ ETH
  (cả `execute` bị revert, proposal vẫn chưa finalized và có thể execute lại khi quỹ đủ).
- Bỏ phiếu thành công là điều kiện của quest #4.

### 3.7 Dashboard & lịch sử hoạt động

- Số dư ECO: `EcoToken.balanceOf`; badge: `ImpactBadge.getBadgesByOwner` + `getBadge` + `tokenURI`.
- Activity feed (`useActivityFeed`) đọc event: `ListingPurchased` (buyer/seller), `ListingCreated`,
  `ListingCancelled`, `EcoRewarded`, `BadgeMinted`, `CarbonOffsetted`, `QuestCompleted` và `PaymentSplit`
  (doanh thu của nghệ nhân).
- `getContractEvents` quét từ `LOGS_FROM_BLOCK` (trong `contracts.ts`) theo cửa sổ ≤ 50 000 block, tự chia
  đôi khi RPC từ chối ⇒ **cập nhật `LOGS_FROM_BLOCK`** mỗi khi deploy lại contract.

---

## 4. Luồng dữ liệu AI Gemini (Edge Runtime)

### 4.1 Các endpoint

| Route | Runtime | Model config | Đầu ra |
| --- | --- | --- | --- |
| `POST /api/ai/chat` | `edge`, `sin1` | `getChatModel()` — systemInstruction `travelAssistant`, temp 0.7, 2048 tokens | **SSE stream** `data: {"text": ...}` … `data: [DONE]` |
| `POST /api/ai/itinerary` | `edge`, `sin1` | `getStructuredModel(travelAssistant)` — JSON mode, temp 0.5 | JSON lịch trình (normalize) |
| `POST /api/ai/culture-guide` | `edge`, `sin1` | `getStructuredModel(cultureGuide)` | JSON dos/donts/phrases/customs/localFood |
| `POST /api/carbon/calculate` | `edge`, `sin1` | `getStructuredModel(carbonEstimator)` + **retry** | JSON `totalKgCO2`, `breakdown`, `level` |
| `POST /api/ipfs/metadata` | `nodejs` | (không dùng Gemini) | Upload Pinata, cần `PINATA_JWT` |

`preferredRegion = "sin1"` vì Gemini API không khả dụng ở mọi edge location (ví dụ Hong Kong).
`vercel.json` cũng ghim `regions: ["sin1"]`.

### 4.2 Sơ đồ luồng

```mermaid
flowchart TD
    UI["Client component<br/>TravelAssistant / CarbonCalculator / CultureGuideSection"]
    Hook["useAIChat<br/>fetch + AbortController"]
    UI --> Hook
    Hook -->|"POST JSON"| Route

    subgraph Edge["Vercel Edge Function (sin1)"]
        Route["route.ts"]
        Guard["readAIRequest() — lib/api.ts"]
        RL{"rateLimit()<br/>20 req / 60s / IP+route"}
        Redis[("Upstash Redis<br/>INCR + PEXPIRE NX + PTTL")]
        Mem[("In-memory Map<br/>fallback")]
        Cfg{"GEMINI_API_KEY<br/>có cấu hình?"}
        Size{"body ≤ 16 KB<br/>& JSON hợp lệ?"}
        Val["parse*Request() — ai-validation.ts<br/>sanitizeText, LIMITS, chặn &quot;&quot;&quot;"]
        Prompt["Dựng prompt: dữ liệu người dùng<br/>bọc trong &quot;&quot;&quot;...&quot;&quot;&quot; (chống prompt injection)<br/>system prompt → systemInstruction"]
        TO["withGeminiTimeout (20s)<br/>withGeminiRetry 429/500/503 (carbon: 3×7s)"]
        Norm["extractJsonObject → normalize*()<br/>(ép kiểu, kẹp giá trị, giới hạn list)"]
        SSE["ReadableStream → SSE<br/>data: {text} … data: [DONE]"]
        Err["errorResponse()<br/>400 / 429 / 502 / 503 / 500"]
    end

    Gemini[("Google Gemini API<br/>@google/generative-ai, v1beta<br/>GEMINI_MODEL")]

    Route --> Guard --> RL
    RL -->|"có cấu hình"| Redis
    RL -->|"không có / lỗi"| Mem
    RL -->|"vượt"| Err
    RL -->|"ok"| Cfg
    Cfg -->|"không"| Err
    Cfg -->|"có"| Size
    Size -->|"không"| Err
    Size -->|"ok"| Val
    Val -->|"ValidationError"| Err
    Val --> Prompt --> TO --> Gemini
    Gemini -->|"chat: generateContentStream"| SSE
    Gemini -->|"JSON mode: generateContent"| Norm
    TO -->|"timeout 504 / 429 / 503"| Err
    SSE -->|"text/event-stream"| Parser["lib/sse.ts createSSEParser()<br/>buffer theo \n\n, chịu được chunk cắt ngang UTF-8"]
    Norm -->|"application/json"| UI
    Parser --> UI
    Err --> UI
```

### 4.3 Điểm cần nhớ khi sửa code AI

- **Ngân sách thời gian Edge:** Vercel Edge phải bắt đầu trả response trong ~25s ⇒
  `GEMINI_TIMEOUT_MS = 20_000`; khi retry mỗi lần chỉ 7s (`GEMINI_RETRY_ATTEMPT_TIMEOUT_MS`).
  Với stream, chỉ bọc timeout quanh lời gọi **mở** stream, không cắt câu trả lời dài.
- **Lỗi giữa stream:** header đã gửi nên lỗi được gửi như một SSE event `{"error": ...}` rồi `[DONE]`.
- **Không nối system prompt với input** — luôn dùng `systemInstruction` (`lib/gemini.ts`).
  Dữ liệu người dùng luôn đặt trong `"""..."""` và `sanitizeText` thu gọn `"""` để không đóng được delimiter.
- **Không tin output model:** mọi JSON đi qua `normalize*()` trước khi trả về client.
- Edge runtime ⇒ **không** dùng API Node (`fs`, `Buffer`, `crypto` của Node). Rate limit Redis gọi qua `fetch` REST nên chạy được trên Edge.
- Thông báo lỗi trả cho người dùng theo ngôn ngữ đã chọn (`getRequestLocale` đọc cookie `locale`), không lộ chi tiết nội bộ.
- Prompt có hai bản Việt/Anh (`getSystemPrompt(name, locale)`); AI trả lời bằng ngôn ngữ đang chọn.
- Model mặc định: `GEMINI_MODEL` hoặc `gemini-3.8-flash`.

---

## 5. Hướng dẫn Local Development từ A–Z

> Môi trường chính của dự án là **Windows + Git Bash** (các script `*.sh` cần bash). Trên macOS/Linux các lệnh dưới đây vẫn dùng được.

### Bước 0 — Cài công cụ

| Công cụ | Ghi chú |
| --- | --- |
| Git (+ Git Bash trên Windows) | clone kèm submodule |
| [Foundry](https://getfoundry.sh/) | `forge`, `cast`, `anvil` trên `PATH` |
| Node.js ≥ 20 + npm | CI ghim npm 11.6.1 (`npx -y npm@11.6.1 ci`) |
| GNU Make | tuỳ chọn; có thể chạy trực tiếp lệnh `forge script` tương ứng |
| MetaMask | để test thủ công trên trình duyệt |

### Bước 1 — Clone & cài dependency

```bash
git clone --recurse-submodules <repo-url> HomeLab
```

```bash
cd HomeLab && git submodule update --init --recursive
```

```bash
cd frontend && npm ci
```

### Bước 2 — Build & test contracts

```bash
cd contracts && forge build --sizes
```

```bash
cd contracts && forge test -vvv
```

```bash
cd contracts && forge coverage
```

### Bước 3 — Chạy Anvil (terminal riêng, giữ mở)

```bash
anvil --chain-id 31337
```

Port **8545** phải trống — transport Anvil của frontend cố định `http://127.0.0.1:8545`.

### Bước 4 — Deploy toàn bộ contracts lên Anvil

```bash
cd contracts && make deploy-local
```

- Dùng private key account #0 công khai của Anvil (không phải secret).
- Trên Anvil, script **bỏ qua** `PRIVATE_KEY` và các `*_ADDRESS` trong `.env` (luôn deploy mới).
- Kết quả ghi vào `contracts/deployments/local.json`; địa chỉ phải khớp với khối `[anvil.id]` trong
  [frontend/src/config/contracts.ts](frontend/src/config/contracts.ts)
  (EcoToken `0x5FbD…0aa3`, …, CarbonOffset `0x0165…Eb8F`, QuestRewards `0xa513…C853` — xem file). Nếu Anvil đã có giao dịch khác
  trước đó, địa chỉ sẽ lệch ⇒ restart Anvil rồi deploy lại.
- 6 quest mặc định được nạp tự động qua `QuestSetup.addDefaultQuests`.

(Tuỳ chọn) chạy kịch bản E2E bằng `cast` — tạo listing → mua → kiểm tra số dư → tạo proposal → vote & execute:

```bash
cd contracts && make simulate-e2e
```

### Bước 5 — Đồng bộ ABI (chỉ khi đổi interface contract)

ABI frontend là bản copy artifact Foundry. Sau khi sửa contract:

```bash
cd contracts && forge build && for c in EcoToken ImpactBadge CommunityTreasury Governance PaymentSplitter Marketplace CarbonOffset QuestRewards; do cp out/$c.sol/$c.json ../frontend/src/abis/$c.json; done
```

Frontend chỉ đọc trường `.abi` (`EcoTokenJson.abi as Abi`).

### Bước 6 — Cấu hình môi trường frontend

```bash
cd frontend && cp .env.example .env.local
```

Giá trị tối thiểu cho local:

```dotenv
NEXT_PUBLIC_CHAIN_ID=31337          # dùng Anvil; 11155111 để dùng Sepolia
GEMINI_API_KEY=<key từ https://aistudio.google.com/>   # thiếu ⇒ các route AI trả 503
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=                   # tuỳ chọn; trống ⇒ chỉ có MetaMask injected
PINATA_JWT=                                             # tuỳ chọn; trống ⇒ /api/ipfs/metadata trả 503 IPFS_DISABLED
UPSTASH_REDIS_REST_URL= / UPSTASH_REDIS_REST_TOKEN=     # tuỳ chọn; trống ⇒ rate limit in-memory
```

Không commit `.env.local` / `contracts/.env`. Biến không có tiền tố `NEXT_PUBLIC_` chỉ dùng phía server.

### Bước 7 — Chạy frontend

```bash
cd frontend && npm run dev
```

Mở http://localhost:3000. Chạy bản production cục bộ (giống cấu hình `.claude/launch.json`, port 3123):

```bash
cd frontend && npm run build && npm run start -- -p 3123
```

`NEXT_DIST_DIR=.next-claude` cho phép build production chạy song song với `next dev` (đang dùng `.next`).

### Bước 8 — Kết nối MetaMask với Anvil

1. Thêm network: RPC `http://127.0.0.1:8545`, Chain ID `31337`, ký hiệu `ETH`.
2. Import private key các account dev của Anvil (in ra khi khởi động `anvil`).
   Quy ước trong scripts: #0 deployer, #1 nghệ nhân `0x7099…79C8`, #2 người mua `0x3C44…93BC`.
3. Mỗi lần restart Anvil: MetaMask → Settings → Advanced → **Clear activity tab data** (reset nonce).
4. Muốn vote DAO: phải có ECO (mua hàng để nhận thưởng) và **delegate** cho chính mình trước khi tạo proposal.
   Tua thời gian trên Anvil để kết thúc voting period:

```bash
cast rpc evm_increaseTime 3601 && cast rpc evm_mine
```

### Bước 9 — Kiểm tra chất lượng trước khi commit (giống CI)

```bash
cd contracts && forge build --sizes && forge test
```

```bash
cd frontend && npm run typecheck && npx eslint src test e2e && npm test
```

E2E (tự khởi động Anvil mới, deploy bằng `Deploy.s.sol`, seed dữ liệu, build app ở port 3210 — **dừng Anvil
của bạn trước** vì cần port 8545):

```bash
cd frontend && npx playwright install chromium && npm run e2e
```

```bash
cd frontend && E2E_SKIP_BUILD=1 npm run e2e -- tests/04
```

Chi tiết fixture: [frontend/e2e/README.md](frontend/e2e/README.md).

### Bước 10 — (Tham khảo) Sepolia & Vercel

- `contracts/.env` (copy từ `.env.example`): `PRIVATE_KEY`, `SEPOLIA_RPC_URL`, `ETHERSCAN_API_KEY`.
- Deploy đầy đủ: `make deploy-sepolia`; tiếp tục khi lỗi giữa chừng: điền `*_ADDRESS` đã có rồi `make deploy-sepolia-resume`.
- Contract riêng lẻ: `make deploy-carbon-sepolia`, `make deploy-quests-sepolia` (dùng `--skip-simulation`
  vì forge ước tính gas CREATE thấp hơn thực tế trên Sepolia).
- Sau khi deploy Sepolia: cập nhật `DEPLOYMENTS[sepolia.id]` + `LOGS_FROM_BLOCK` trong `contracts.ts`
  và [docs/DEPLOYMENTS.md](docs/DEPLOYMENTS.md).
- Frontend deploy lên Vercel qua `.github/workflows/deploy.yml` (Git auto-deploy của Vercel đang tắt).

---

## 6. Quy ước & lưu ý cho Claude

- Comment trong file Solidity: **tiếng Anh, ngắn gọn**. Comment khác, tài liệu: **tiếng Việt**; tên biến/hàm: tiếng Anh.
- Giao diện song ngữ Việt/Anh, mặc định tiếng Việt, ngôn ngữ lưu ở cookie `locale`. Mọi chữ hiển thị phải có đủ hai bản:
  component dùng `const { t, locale } = useI18n()` rồi `t("Tiếng Việt", "English")`; code không có hook dùng `pick(locale, vi, en)` từ `lib/i18n.ts`;
  server component và `generateMetadata` dùng `getLocale()` từ `lib/i18n-server.ts`. Số và ngày truyền `locale` vào hàm format (dấu phân cách khác nhau giữa hai ngôn ngữ).
  Dữ liệu tĩnh tiếng Anh nằm cạnh bản Việt: `labelEn`, `culturalData.en.ts`, `HERITAGE_EN`, `QUESTS_EN`.
- Solidity: giữ mẫu **Checks-Effects-Interactions**, `nonReentrant` trên hàm chuyển ETH, custom error thay vì
  `require` string, pull-pattern cho phí platform. Mỗi thay đổi contract cần test trong `contracts/test/`.
- Không đổi thứ tự deploy / không thêm tx vào broadcast block 1 của `Deploy.s.sol` mà không cập nhật địa chỉ Anvil.
- Giao diện sáng theo design system ở [docs/UX-UI.md](docs/UX-UI.md) mục 4: chỉ dùng token màu theo vai trò
  (`bg`, `surface`, `text`, `text-muted`, `primary`, `accent`, `danger`…, khai báo trong `globals.css`) — bảng màu mặc định
  của Tailwind đã bị thay nên `slate-*`/`emerald-*` không có tác dụng. Bo góc chỉ `rounded-sm`/`-md`/`-lg`, chữ ≥ `text-xs`,
  icon dùng `lucide-react` (dữ liệu trong `lib/` lưu **tên** icon, hiển thị qua `AppIcon`), chữ mono chỉ cho địa chỉ ví và mã giao dịch.
  Ưu tiên component trong `src/components/ui/` (`Button`, `TxButton`, `Modal`, `Field`…). `test/design-system.test.mjs` kiểm tra các quy tắc này.
- Next.js: đọc [frontend/AGENTS.md](frontend/AGENTS.md) — kiểm tra docs trong `node_modules/next/dist/docs/`
  trước khi dùng API Next mà bạn không chắc. Block trong `AGENTS.md` do `next dev` tự sinh lại.
- Route AI mới: dùng lại `readAIRequest` + `errorResponse` + `withGeminiTimeout`, khai báo
  `runtime = "edge"` và `preferredRegion = "sin1"`, viết validator/normalizer trong `ai-validation.ts`
  và unit test trong `frontend/test/`.
- CSP (`next.config.mjs`) chỉ cho phép `http://` tới `127.0.0.1:8545` / `localhost:8545`; RPC local khác sẽ bị chặn.
