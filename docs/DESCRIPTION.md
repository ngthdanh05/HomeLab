# DESCRIPTION.md — Trạng thái dự án MyHomeLab

> Cập nhật: 2026-11-06 · Nhánh `main` (commit mới nhất `c56fca9`)
> Kế hoạch chi tiết: [PLAN.md](PLAN.md) · Địa chỉ contract: [DEPLOYMENTS.md](DEPLOYMENTS.md)

**MyHomeLab** là nền tảng du lịch sinh thái tuần hoàn: Smart Contract chia doanh thu D2C (70% nghệ nhân / 20% Quỹ Cộng đồng / 10% nền tảng), thưởng EcoToken + NFT ImpactBadge cho du khách, kèm AI Travel Assistant (Gemini) và kho di sản số 360° (Three.js).

---

## 1. Tiến độ theo PLAN.md

| Phase | Nội dung | Trạng thái |
| --- | --- | --- |
| 1 | Smart Contracts core (6 contracts + unit test) | ✅ Hoàn thành |
| 2 | Deploy Anvil / Sepolia + verify Etherscan | ✅ Hoàn thành |
| 3 | AI Engine + Culture Guide + 360° Archive | ✅ Hoàn thành (đã review & sửa lỗi) |
| 4 | Task 4.1 D2C Marketplace UI | ✅ Hoàn thành |
| 4 | Task 4.2 Dashboard & Badge Gallery | ✅ Hoàn thành |
| 4 | Task 4.3 Carbon Tracker | ✅ Hoàn thành (CarbonOffset đã deploy Sepolia, đã bù đắp thật qua UI) |
| 4 | Task 4.4 Eco Quests | ✅ Hoàn thành (QuestRewards đã deploy Sepolia, đã claim thật qua UI) |
| 5 | Task 5.1 Community DAO Governance UI | 🟡 Xong trên Anvil, chưa test Sepolia (cần hạ ngưỡng tạo đề xuất) |
| 5 | Task 5.2 E2E Playwright + CI | ✅ Hoàn thành (PR #1 đã merge, CI 3/3 job pass trên GitHub) |
| 5 | Task 5.3 Performance / A11y / SEO audit | ✅ A11y + SEO 100; Perf mobile 90–98 / desktop 100 (trừ trang chi tiết sản phẩm, bị giới hạn bởi cổng IPFS); LCP mobile 2.4–3.5 s |
| 5 | Task 5.4 Vercel | ⏳ Chưa bắt đầu |

## 2. Contract đang dùng trên Sepolia (chain 11155111)

| Contract | Địa chỉ |
| --- | --- |
| EcoToken | `0xacB3267dBBeA4924cEE9e5631618DB8342f39a24` |
| ImpactBadge | `0xba5404682DB9feb35fBB1cbC18b97f1A59b7a9C9` |
| CommunityTreasury | `0x10E83c02C8667485EDd78ce57E0f6553D33296e6` |
| Governance | `0x1e0404A2EDC3BB2139A82d2e8372631A11697998` |
| PaymentSplitter | `0x5d574343A7e162Be9f3eA9Da676169d7Df874a66` |
| Marketplace | `0x92e554039D39014A5Fc55b31B1308f9DFe1098D5` |
| CarbonOffset | `0x4d51Ea6E0ACeBeBa0b96a72655B10457d769DFF5` |
| QuestRewards | `0x562845c0bd4F75e1d90207357A57f8aFA8f06F05` |

Quyền: EcoToken `MINTER_ROLE` → PaymentSplitter; ImpactBadge `MINTER_ROLE` → Marketplace, CarbonOffset, QuestRewards; EcoToken `MINTER_ROLE` cũng cấp cho QuestRewards. Quyền của các bản cũ đã thu hồi. Owner: `0x37a036E7a5f85025C54837FcBD6927A8f7969242`.

---

## 3. Công việc đã hoàn thành trong đợt này (2026-11-03 → 2026-11-05)

### 3.1 Review & sửa Phase 3 (frontend)
- **360° viewer không hiển thị** (canvas bị xoá ngay sau khi tạo) → viết lại `hooks/useThreeScene.ts`: pointer events, phân biệt kéo/click hotspot, giải phóng WebGL, trạng thái loading.
- **Chat stream mất chữ / vỡ dấu tiếng Việt** → `lib/sse.ts` + `hooks/useAIChat.ts`.
- **Bảo mật API AI**: validate & sanitize input (`lib/ai-validation.ts`), rate limit (`lib/rate-limit.ts`), giới hạn body, chuẩn hoá JSON trả về từ AI, `systemInstruction` cho Gemini, map lỗi quá tải → 503 (`lib/api.ts`).
- Nâng `next` 14.2.0 → 14.2.35 (vá CVE), security headers, `@types/three`, đủ 10 câu/điểm đến, địa chỉ contract theo từng chain.

### 3.2 Sửa lỗi deploy trên Sepolia
- Marketplace cũ `0x20b0…` deploy sai tham số (owner là contract, splitter trỏ vào EcoToken) → deploy lại.
- `contracts/script/Deploy.s.sol`: bỏ qua biến resume trong `.env` khi chạy Anvil (`make deploy-local` chạy lại được).

### 3.3 Task 4.1 — D2C Marketplace UI
- Trang `app/marketplace/page.tsx` (lọc, skeleton, empty/error state) và `app/marketplace/[listingId]/page.tsx`.
- Components: `ListingCard`, `PurchaseButton`, `CancelListingButton`, `CreateListingModal`, `SplitBreakdown`, `ui/Toast`, `layout/SiteHeader`.
- Hooks: `useMarketplace`, `usePaymentSplitter`, `useContractTx`, `useActiveChain`.
- API `app/api/ipfs/metadata/route.ts` upload ảnh/metadata lên Pinata (JWT chỉ ở server, kiểm tra magic bytes).

### 3.4 Sửa lỗi thưởng ECO (contract)
- Trước: ECO được mint cho Marketplace thay vì người mua.
- Sau: `IPaymentSplitter.splitPayment(seller, buyer, pType)`; Marketplace truyền `msg.sender`. Thêm `test/MarketplaceIntegration.t.sol` + test cho PaymentSplitter/Marketplace.
- Deploy lại PaymentSplitter + Marketplace trên Sepolia, verify Etherscan, cập nhật quyền mint.

### 3.5 Sửa lỗi "Không đọc được dữ liệu Marketplace" và kẹt "Đang chờ giao dịch…"
- **Nguyên nhân gốc:** `NEXT_PUBLIC_SEPOLIA_RPC_URL` trỏ nhầm Alchemy **Mainnet** → đã đổi sang `eth-sepolia`.
- `lib/rpc.ts` + `config/wagmi.ts`: RPC trong `.env` → publicnode → `rpc.sepolia.org` (fallback), tự loại URL sai mạng.
- `components/RpcHealthCheck.tsx`: kiểm tra `eth_chainId` khi tải app, báo lỗi nếu RPC sai mạng.
- `useContractTx`: timeout chờ receipt 90s, trạng thái "Đã gửi, đang chờ xác nhận" thay vì "thất bại", tự refetch dữ liệu; danh sách tự làm mới mỗi 30s.

### 3.6 Task 4.2 — Dashboard & NFT Badge Gallery
- Trang `app/dashboard/page.tsx` (+ layout, link "🏅 Dashboard" trên header): yêu cầu kết nối ví, cảnh báo sai mạng.
- `TokenBalance` (đếm tăng dần, tôn trọng reduced-motion, hiển thị tỉ lệ thưởng ECO/ETH), `BadgeGallery` + `BadgeCard` (lật 3D, lọc theo loại, skeleton, fallback ảnh theo loại badge, link Etherscan NFT), `ActivityFeed` (gộp theo giao dịch: mua/bán/đăng/huỷ + chia 70/20/10 + ECO thưởng + badge).
- Hooks: `useEcoTokenBalance`, `useUserBadges` (getBadgesByOwner → getBadge/tokenURI → metadata IPFS), `useActivityFeed` (quét event theo đoạn ≤49k block vì RPC công khai giới hạn 50k, tự chia nhỏ khi RPC từ chối).
- `lib/dashboard.ts` + `test/dashboard-lib.test.mjs`. `useContractTx` làm mới cả lịch sử hoạt động sau mỗi giao dịch; nút Mua hiển thị link sang Dashboard.
- Đã kiểm tra trên Sepolia với ví người mua thật (chỉ đọc): số dư ECO, badge #1 và giao dịch mua hiển thị đúng.
- Đã mua thật thêm 1 giao dịch qua MetaMask: Dashboard tự làm mới số dư ECO, badge và lịch sử hoạt động, không cần F5. Đủ 5/5 DoD.

### 3.7 Task 4.3 — Carbon Tracker
- **Contract mới `CarbonOffset.sol`** (vì `ImpactBadge.mintBadge()` chỉ cho `MINTER_ROLE`): `offset(carbonGrams, metadataURI)` thu phí theo kg CO₂ (`pricePerKgWei`, mặc định 0.00001 ETH/kg, làm tròn lên) → toàn bộ vào `CommunityTreasury`, mint badge `ZERO_CARBON`, hoàn tiền thừa, lưu `offsetGramsOf` / `offsetCountOf`, giới hạn 100 tấn/lần và metadata ≤ 2 KB, có `ReentrancyGuard`. 15 test mới (`test/CarbonOffset.t.sol`, có fuzz + reentrancy).
- Deploy: `Deploy.s.sol` deploy thêm CarbonOffset (bước 7) và cấp `MINTER_ROLE`; `script/DeployCarbonOffset.s.sol` + `make deploy-carbon-sepolia` để deploy riêng lên Sepolia (đã chạy thử trên Anvil).
- Frontend: trang `/carbon-tracker` (link "🌍 Carbon" trên header) gồm `CarbonCalculator` (nhiều chặng, 7 phương tiện, hệ số DEFRA 2023, chia theo số người đi chung; tab "Mô tả cho AI"), `CarbonMeter` (gauge SVG 3 mức: < 50 / < 200 / ≥ 200 kg), `CarbonOffsetButton` (metadata badge dạng `data:` URI: điểm đến, hành động, lượng CO₂) và thẻ tóm tắt "Chuyến đi phát thải X kg CO₂. Đã được bù đắp bởi Y badge".
- API `/api/carbon/calculate` (Edge, Gemini): validate/sanitize input, gửi bảng hệ số cho AI, tự tính lại tổng từ breakdown và mức phát thải.
- `lib/carbon-utils.ts` + `test/carbon-utils.test.mjs`; hook `useCarbonOffset`. Dashboard có thêm loại hoạt động "🌍 Bù đắp carbon" (event `CarbonOffsetted`).
- Header chuyển sang lưới 2×2 trên mobile (4 link làm tràn ngang 375px).
- **Đã kiểm tra trên Anvil** (ví thử): bù đắp 155,8 kg CO₂ → Quỹ nhận 0,0015579 ETH, badge #1 `ZERO_CARBON` có metadata Hội An, thẻ tóm tắt và Dashboard tự cập nhật.
- **Deploy Sepolia:** `CarbonOffset` tại `0x4d51Ea6E0ACeBeBa0b96a72655B10457d769DFF5` (block 12068939, verify Etherscan), đã cấp `MINTER_ROLE`. Địa chỉ được ghi mặc định trong `frontend/src/config/contracts.ts` (env `NEXT_PUBLIC_SEPOLIA_CARBON_OFFSET_ADDRESS` ghi đè được), `LOGS_FROM_BLOCK.carbonOffset = 12068939`.
  - Lỗi deploy lần đầu: giao dịch tạo contract **hết gas** (`0x3CE5…f467`, status 0). Forge 1.7.1 giả lập cục bộ chỉ ước tính ~828k gas, còn Sepolia hiện tính ~4,2M. Đã thêm `--skip-simulation` vào `make deploy-carbon-sepolia` để dùng `eth_estimateGas` của RPC.
- **Đã kiểm tra trên Sepolia** (qua UI, ví owner `0x37a0…9242`): bù đắp 155,8 kg CO₂ → Quỹ nhận 0,0015579 ETH, badge #3 `ZERO_CARBON` (tx `0x1eab20b9…8bca7b`); thẻ tóm tắt, Bộ sưu tập badge và Lịch sử hoạt động trên Dashboard đều hiển thị đúng.
- **AI estimate:** `/api/carbon/calculate` trả kết quả đúng với mô tả tự do (vd. Hà Nội → Đà Nẵng → Hội An → tàu về: 231,71 kg, mức cao; các con số khớp bảng hệ số). Gemini `gemini-3.8-flash` thường xuyên trả 503 quá tải nên route tự thử lại 2 lần (`withGeminiRetry` trong `lib/gemini.ts`); khi vẫn lỗi, UI hiện "Dịch vụ AI đang quá tải". Trên UI chưa lần nào lấy được kết quả thành công do Gemini quá tải; nên bấm thử lại tab "Mô tả cho AI" khi Gemini ổn định.

### 3.8 Task 4.4 — Eco Quest & Achievement System
- **Contract mới `QuestRewards.sol`** (`MINTER_ROLE` trên EcoToken + ImpactBadge): `claim(questId, proofIds)` kiểm tra điều kiện on-chain rồi mint ECO và/hoặc badge; `isCompleted[user][questId]` chặn claim lại (`AlreadyCompleted`); có `canClaim` (view, không revert), `getQuests`, `completedOf`; owner thêm/tắt quest (`addQuest`, `setQuestActive`), `addQuest` từ chối cấu hình không an toàn. 21 test (`test/QuestRewards.t.sol`, có fuzz + reentrancy).
  - Loại điều kiện: `BADGES_OF_TYPE` (badge `ECO_CHECKIN` mà ví là người nhận gốc — Marketplace mint khi mua hàng thủ công; chuyển NFT sang ví khác không dùng lại được), `OFFSET_COUNT` / `OFFSET_GRAMS` (CarbonOffset), `DAO_VOTE` (`Governance.hasVoted`), `SELF_ATTESTED` (hành động off-chain: chỉ thưởng badge, không ECO).
- **6 quest** (`contracts/script/QuestSetup.sol` ↔ `frontend/src/data/quests.ts`):

  | # | Quest | Điều kiện | Thưởng |
  | --- | --- | --- | --- |
  | 0 | Lần đầu ủng hộ nghệ nhân | 1 sản phẩm thủ công | 10 ECO |
  | 1 | Người bảo trợ nghệ nhân | 3 sản phẩm thủ công | 30 ECO + Culture Guardian |
  | 2 | Carbon offset lần đầu | 1 lần bù đắp | 10 ECO |
  | 3 | Người hùng khí hậu | tổng ≥ 100 kg CO₂ | 25 ECO + Zero Carbon |
  | 4 | Tiếng nói cộng đồng | vote 1 đề xuất DAO | 20 ECO + Community Donor |
  | 5 | Nhà thám hiểm di sản | xem cả 3 di sản 360° (localStorage) | Culture Guardian |
- Deploy: `Deploy.s.sol` bước 8 deploy QuestRewards, nạp quest, cấp quyền (resume bằng `QUEST_REWARDS_ADDRESS`); `script/DeployQuestRewards.s.sol` + `make deploy-quests-sepolia` để deploy riêng lên Sepolia.
- Frontend: trang `/quests` (link "🎯 Quests"), `QuestCard` (thanh tiến độ, thưởng ECO + badge, nút "🎁 Nhận thưởng", dấu ✓ khi xong), `QuestProgress` (tổng X/6 quest, ECO đã nhận), `QuestCelebration` (popup + confetti, tôn trọng `prefers-reduced-motion`), hook `useQuestProgress` (badge on-chain, CarbonOffset, event `VoteCast`, `completedOf`, localStorage di sản), `lib/quests.ts` + `test/quests.test.mjs`. Dữ liệu di sản chuyển sang `src/data/heritage.ts`; `ArchiveGallery` ghi nhận di sản đã mở. Dashboard có loại hoạt động "🎯 Hoàn thành quest". Header 5 link: lưới 3 cột trên mobile.
- **Sửa lỗi hết gas khi nhận ECO:** `eth_estimateGas` chạy theo block mới nhất; nếu ví vừa có checkpoint ERC20Votes trong block đó, giao dịch thật (block sau) phải tạo checkpoint mới (~45k gas nữa) → revert. `useContractTx` giờ tự ước tính gas và cộng 25% (`GAS_BUFFER_PERCENT`) cho mọi giao dịch.
- **Đã kiểm tra trên Anvil** (ví thử #2: mua 3 sản phẩm, bù đắp 120 kg, vote đề xuất #1, mở 3 di sản): claim đủ 6 quest qua UI, ECO tăng đúng 95, badge thưởng được mint, thẻ chuyển ✓ "Đã nhận thưởng", popup hiện đúng, Dashboard hiện "Hoàn thành quest"; claim lại bị contract chặn (`AlreadyCompleted`). Giao diện ổn ở 375 / 768 / 1024 px.
- **Deploy Sepolia:** `QuestRewards` tại `0x562845c0bd4F75e1d90207357A57f8aFA8f06F05` (block 12069700, verify Etherscan), 6 quest, đã cấp `MINTER_ROLE`. Địa chỉ ghi mặc định trong `frontend/src/config/contracts.ts` (env `NEXT_PUBLIC_SEPOLIA_QUEST_REWARDS_ADDRESS` ghi đè được), `LOGS_FROM_BLOCK.questRewards = 12069700`.
- **Đã kiểm tra trên Sepolia** (qua UI, ví owner `0x37a0…9242`): tiến độ đọc đúng dữ liệu thật (2 quest carbon đủ điều kiện nhờ lần bù đắp 155,8 kg; quest mua hàng 0 vì ví này là người bán). Claim liên tiếp "Người hùng khí hậu" (tx `0x8e8fe89f…b1c2`, +25 ECO, badge Zero Carbon) và "Carbon offset lần đầu" (tx `0x6cb9efdb…e147`, +10 ECO) → 2/6, 35 ECO; claim lại bị chặn (`AlreadyCompleted(3)`).

### 3.9 Task 5.1 — Community DAO Governance UI (2026-11-06)
- Trang `/governance` (link "🗳️ DAO" trên header; 6 link → lưới 3 cột trên mobile): `TreasuryStats` (số dư Quỹ, tổng đã giải ngân, số đề xuất đang bỏ phiếu, ngưỡng / quorum / thời gian bỏ phiếu đọc từ contract), `VotingPowerPanel`, bộ lọc (Tất cả / Đang bỏ phiếu / Chờ thực thi / Đã kết thúc), lưới `ProposalCard` (tên dự án, ETH yêu cầu, thanh Đồng ý/Phản đối, tiến độ quorum, đếm ngược), lịch sử giải ngân (`CommunityTreasury.disbursements`).
- Trang `/governance/[proposalId]`: mô tả đầy đủ, ví nhận / người đề xuất (link Etherscan), `VoteButtons` ("Vote For 👍" / "Vote Against 👎", khoá sau khi vote → "✅ Bạn đã vote rồi"), `ExecuteProposalButton` (hiện khi hết hạn + đạt quorum: "💸 Thực thi giải ngân" nếu thông qua, "Chốt kết quả: từ chối" nếu không; cảnh báo khi Quỹ không đủ ETH), danh sách phiếu bầu từ event `VoteCast`.
- `CreateProposalModal`: tên dự án, mô tả, số ETH, ví nhận ("Dùng ví của tôi"); kiểm tra số dư ECO ≥ `proposalThreshold`, cảnh báo khi số ETH vượt số dư Quỹ.
- **Quyền biểu quyết:** ECO là ERC20Votes nên phải `delegate()` mới có phiếu, và phiếu tính tại block snapshot (block ngay trước khi tạo đề xuất) → `VotingPowerPanel` có nút "⚡ Kích hoạt quyền vote" (delegate cho chính mình). Ví kích hoạt **sau** khi đề xuất được tạo sẽ không vote được đề xuất đó (`NoVotingPower`, UI giải thích lý do).
- Contract không có `getActiveProposals()` / trường `status`: `lib/governance.ts` suy ra trạng thái từ `deadline`, `quorumVotes`, `votesFor/Against`, `finalized`. Tên dự án lưu ở dòng đầu của `description`.
- Hooks `useGovernance` (`useProposals`, `useProposal`, `useVotingPower`, `useProposalVotes`, `useChainNow` — lấy max(giờ máy, timestamp block) để khớp Anvil khi tua thời gian), `useTreasury`. `useContractTx` làm mới cả danh sách phiếu bầu sau mỗi giao dịch. Thông báo lỗi thân thiện cho `AlreadyVoted`, `NoVotingPower`, `VotingClosed`, `VotingNotEnded`, `QuorumNotReached`, `AlreadyFinalized`, `BelowProposalThreshold`, `InsufficientBalance`….
- `test/governance.test.mjs` (19 test).
- **Đã kiểm tra trên Anvil** (`make deploy-local`: ngưỡng 1 ECO, quorum 1%, bỏ phiếu 1 giờ; ví thử #1 có 50 ECO, ví #2 có 30 ECO, Quỹ 1 ETH): kích hoạt quyền vote qua UI → tạo đề xuất #1 (0,3 ETH) → Vote For (50 ECO), ví #2 vote phản đối (30 ECO) → vote lại bị contract chặn (`AlreadyVoted`) → tua thời gian qua deadline → "Thực thi giải ngân" → Quỹ 1 → 0,7 ETH, "Đã giải ngân 0,3 ETH", đề xuất chuyển "💸 Đã giải ngân" không cần F5. Ví 0 ECO bị chặn tạo đề xuất. Không tràn ngang ở 375 px.
- **Sepolia chưa test được:** Governance hiện có `proposalThreshold = 100 ECO` nhưng tổng cung ECO chỉ 37 ECO (ví owner có 35 ECO, chưa delegate) → chưa ai tạo được đề xuất. Quorum 4%, thời gian bỏ phiếu 14 giờ, Quỹ có 0,0055579 ETH. Owner `0x37a0…9242` cần gọi `Governance.setProposalThreshold(...)` (vd. 10 ECO) rồi: kích hoạt quyền vote → tạo đề xuất (số ETH ≤ số dư Quỹ) → vote → chờ hết 14 giờ (hoặc `setVotingPeriod(3600)` **trước khi** tạo đề xuất) → thực thi.

### 3.10 Task 5.2 — E2E Playwright + CI (2026-11-06)
- `frontend/e2e/`: Playwright chạy bản build production của app cho Anvil (`NEXT_PUBLIC_CHAIN_ID=31337`, thư mục `.next-e2e`, cổng 3210). `global-setup` khởi động Anvil sạch, deploy bằng `script/Deploy.s.sol`, kiểm tra địa chỉ khớp `src/config/contracts.ts`, seed (50 ECO cho ví voter, Quỹ 1 ETH, 1 listing đồ thủ công 0,01 ETH). Mỗi test chạy giữa `evm_snapshot`/`evm_revert`.
- Ví giả lập MetaMask (`fixtures/mock-wallet.ts`): provider EIP-1193 + EIP-6963, chuyển request tới Anvil; kết nối qua đúng luồng ConnectKit "Connect Wallet → MetaMask".
- 5 file / 9 test: kết nối ví (+ giữ kết nối khi reload), mua hàng (toast, chia 70/20/10 on-chain, badge ECO_CHECKIN, không mua lại được), bù đắp carbon (35 kg → phí 0,00035 ETH vào Quỹ, badge ZERO_CARBON), DAO (delegate → tạo đề xuất → vote → tua thời gian → thực thi → Quỹ 1 → 0,7 ETH; ví dưới ngưỡng bị chặn), Dashboard (ECO, badge gallery, lịch sử).
- Coverage V8 của `src/` trong lúc chạy E2E (`e2e/coverage/`, monocart-reporter): ~70% dòng, 66 file. Báo cáo Playwright ở `e2e/playwright-report/` (trace/video khi fail, kèm console trình duyệt).
- CI `.github/workflows/ci.yml`: job `contracts`, `frontend`, `e2e`; thêm `.gitmodules` (trước đây `contracts/lib/*` là gitlink không có URL nên CI không checkout được).
- **Lỗi app tìm ra nhờ E2E (đã sửa):**
  - ConnectKit mặc định yêu cầu ví chuyển sang chain đầu tiên (Sepolia) khi kết nối, kể cả khi app build cho Anvil → `Web3Provider` đặt `initialChainId = DEFAULT_CHAIN_ID`.
  - viem cache `getBlockNumber()` 4 giây → lần làm mới ngay sau giao dịch quét log tới block cũ, bỏ sót phiếu bầu / hoạt động vừa xảy ra (danh sách "Phiếu bầu (0)" sau khi vote). Đã dùng `cacheTime: 0` trong `useGovernance`, `useActivityFeed`, `useQuestProgress`.
  - Bấm nút giao dịch ngay sau khi tải trang (wagmi đang kết nối lại ví) mở modal kết nối thay vì gửi giao dịch → `useContractTx` chờ kết nối lại xong (tối đa 10 s).
- Ổn định: `--repeat-each=3 --retries=0` → 27/27 pass.

### 3.11 Task 5.3 — Performance, Accessibility & SEO audit (2026-11-06)
Chi tiết và bảng điểm: [AUDIT_REPORT.md](AUDIT_REPORT.md). Lighthouse 12.8.2, bản build production (Sepolia).
- **Accessibility 93–96 → 100, SEO 100, Best Practices 100** ở mọi trang (trừ `/marketplace/[id]`: BP 79 do cookie `_cfuvid` của cổng IPFS Pinata công khai). **Performance mobile 78–84 → 90–98, desktop 100** ở 6/7 trang; `/marketplace/[id]` 72 / 76 do ảnh IPFS (cổng công khai ~5 s/ảnh).
- **ConnectKit tải theo yêu cầu:** `providers/WalletModal.tsx` (`useWalletModal().open()` thay `useModal()`) + `components/layout/ConnectWalletButton.tsx` (thay `ConnectKitButton`, tải trước khi rê chuột/focus). ConnectKit + framer-motion + qrcode chỉ tải khi mở modal ví → JS tải lúc vào trang ~663 → ~319 KiB, First Load JS trang chủ 444 → 121 kB.
- Hiệu năng: WalletConnect connector "ngủ" tới khi được dùng (`lazyWalletConnect` trong `config/wagmi.ts`). Trước đây wagmi tải SDK ~400 KiB và mở kết nối relay ở mọi lần tải trang, đây cũng là nguyên nhân khiến reconnect chậm ~0,5 s (Task 5.2). Hai tab Culture/Archive ở trang chủ tải động. `next/image` cho ảnh sản phẩm/badge, kèm loader resize WebP cho cổng Pinata riêng (`lib/image-loader.ts`).
- Sửa lỗi trang chủ tự cuộn qua phần hero khi tải (do `scrollIntoView` của TravelAssistant).
- Accessibility: đổi màu đạt WCAG AA (`emerald-600` → `700` cho nền nút có chữ trắng, `slate-500` → `400` cho chữ phụ, 27 file); thứ tự heading (trang chủ có `h1`, Quests có `h2`); `aria-pressed` cho tab.
- SEO: `lib/seo.ts` (metadataBase, title template, canonical + OpenGraph + Twitter cho từng trang, `generateMetadata` cho trang chi tiết), ảnh OG 1200×630 (`app/opengraph-image.tsx`, Edge runtime), `/sitemap.xml`, `/robots.txt`, viewport/themeColor.
- Bảo mật: thêm Content-Security-Policy, COOP `same-origin-allow-popups` và HSTS vào `next.config.mjs`.
- Xoá 3 đường dẫn ảnh `/destinations/*.jpg` không tồn tại (trường `image` của điểm đến không được hiển thị ở đâu).
- Kiểm tra: unit test 119/119 (thêm `test/seo-image.test.mjs`), E2E 9/9 với CSP mới và modal ví tải trễ (`--repeat-each=3 --retries=0`: 27/27; coverage 74% dòng).

---

## 4. Kiểm thử

| Bộ test | Lệnh | Kết quả |
| --- | --- | --- |
| Smart contracts (Foundry) | `cd contracts && forge test` | 183/183 pass |
| Frontend unit test | `cd frontend && npm test` | 119/119 pass |
| E2E (Playwright + Anvil) | `cd frontend && npm run e2e` | 9/9 pass (coverage ~73% dòng `src/`); chạy trong CI |
| Typecheck · Lint · Build | `npm run typecheck` · `npx eslint src test e2e` · `npm run build` | Sạch |

## 5. Chạy dự án

```bash
# Frontend (Sepolia)
cd frontend && npm install && npm run dev

# Local blockchain + contracts
anvil
cd contracts && make deploy-local
# rồi build frontend với NEXT_PUBLIC_CHAIN_ID=31337
```

Biến môi trường cần có trong `frontend/.env`: xem `frontend/.env.example` (`GEMINI_API_KEY`, `NEXT_PUBLIC_SEPOLIA_RPC_URL` — phải là endpoint **Sepolia**, `PINATA_JWT`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`).

## 6. Việc còn tồn đọng / lưu ý

- Quest "Nhà thám hiểm di sản" là tự khai báo (không kiểm chứng on-chain) nên chỉ thưởng badge; muốn thưởng ECO thì cần backend ký xác nhận (EIP-712).
- **Tiếp theo:** Task 5.4 (Vercel; đặt `NEXT_PUBLIC_SITE_URL`, dùng cổng Pinata riêng), test Task 5.1 trên Sepolia (xem 3.9). Quest "Tiếng nói cộng đồng" giờ làm được qua trang `/governance`.
- Gemini `gemini-3.8-flash` hay quá tải (503, có lúc treo > 90 s). Chỉ route carbon có thử lại; các route `/api/ai/*` có thể dùng `withGeminiRetry` tương tự, hoặc đổi `GEMINI_MODEL`.
- Deploy lên Sepolia: forge giả lập cục bộ đang ước tính thiếu gas cho giao dịch tạo contract → dùng `--skip-simulation` (đã có trong `make deploy-carbon-sepolia`).
- Khi deploy lại ImpactBadge / PaymentSplitter / Marketplace phải cập nhật `LOGS_FROM_BLOCK` trong `frontend/src/config/contracts.ts` (block bắt đầu quét event cho lịch sử hoạt động).
- `DEFAULT_METADATA_URI` của ImpactBadge chưa trỏ tới file metadata thật → Dashboard dùng ảnh/mô tả mặc định theo loại badge.
- `npm audit` còn lỗ hổng trong wagmi/MetaMask và các bản Next ≥ 16 — cần nâng major version (PLAN đang chốt Next 14).
- Rate limit AI/IPFS đang lưu trong bộ nhớ; khi deploy Vercel (Task 5.4) nên chuyển sang Redis.
- Nên giới hạn domain cho API key Alchemy trong dashboard Alchemy (key `NEXT_PUBLIC_` được gửi xuống trình duyệt).
- Nếu `contracts/.env` còn địa chỉ PaymentSplitter/Marketplace cũ, cần cập nhật trước khi chạy deploy ở chế độ resume.
