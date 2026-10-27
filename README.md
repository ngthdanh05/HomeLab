# MyHomeLab — Regenerative Digital Eco-Tourism Platform

> **Hệ sinh thái Du lịch số Tuần hoàn & Tái tạo**  
> Kết hợp **Web3**, **Generative AI** và mô hình kinh tế **D2C (Direct-to-Consumer)** nhằm thúc đẩy du lịch bền vững, chống tẩy xanh và trao quyền cho cộng đồng bản địa.

---

## 1. Bài toán đặt ra (Problem Statement)

Ngành du lịch hiện nay, đặc biệt là phân khúc du lịch sinh thái và văn hóa bản địa, đang đối mặt với nhiều rào cản và hạn chế thực tế:

* **Vấn nạn "Tẩy xanh" (Greenwashing):** Nhiều tổ chức gắn mác "du lịch xanh" hay "bảo vệ môi trường" nhưng thiếu cơ chế minh chứng rõ ràng và độc lập để người dùng kiểm chứng.
* **Kinh tế du lịch bị trung gian chiếm dụng (Intermediaries & Revenue Leakage):** Các nền tảng OTA trung gian cắt phế hoa hồng cao (thường từ 15% - 30%). Nghệ nhân, chủ homestay và người dân địa phương — những người trực tiếp bảo tồn văn hóa và cảnh quan — chỉ nhận lại tỷ lệ doanh thu khiêm tốn và bị thanh toán chậm trễ.
* **Thiếu cơ chế tài chính tái đầu tư cho cộng đồng:** Lợi nhuận từ du lịch hiếm khi được trích tự động và minh bạch để quay lại bảo tồn tự nhiên, tôn tạo di tích hoặc tài trợ cho các dự án xã hội tại chính địa phương đó.
* **Nguy cơ mai một di sản văn hóa:** Di sản phi vật thể, tri thức truyền thống và kỹ nghệ thủ công thiếu các công cụ số hóa hiện đại để lưu trữ, truyền bá và hướng dẫn du khách trải nghiệm đúng mực.

---

## 2. Giải pháp của dự án (Solution)

**MyHomeLab** giải quyết các vấn đề trên thông qua sự kết hợp giữa **Smart Contracts (Blockchain)**, **AI (Gemini)** và **3D Web (Three.js)**:

* **Minh bạch hóa on-chain & Chống tẩy xanh (Proof of Action):** Mọi hành động xanh (check-in sinh thái, giảm phát thải carbon, quyên góp bảo tồn) đều được cấp chứng chỉ NFT `ImpactBadge` với bằng chứng và metadata lưu trữ phi tập trung trên IPFS.
* **Thanh toán trực tiếp & Tự động phân phối (D2C Direct Payment):** Smart contract `PaymentSplitter` tự động chia dòng tiền ngay lập tức khi phát sinh giao dịch mua hàng/đặt tour (ví dụ: 70% tới nghệ nhân, 20% vào Quỹ Cộng đồng, 10% phí nền tảng), loại bỏ trung gian và rủi ro chậm trễ.
* **Kinh tế tuần hoàn (Circular Economy Rewards):** Du khách thanh toán dịch vụ hoặc tham gia nhiệm vụ bảo vệ môi trường nhận được token phần thưởng `EcoToken` (ERC-20), dùng để chiết khấu dịch vụ hoặc sử dụng làm quyền biểu quyết DAO.
* **Tái đầu tư tự động & Quản trị phi tập trung (Community DAO):** 20% doanh thu tự động chảy vào `CommunityTreasury`. Cộng đồng sở hữu `EcoToken` tham gia tạo đề xuất và bỏ phiếu on-chain để quyết định giải ngân tài trợ cho các sáng kiến bảo tồn địa phương.
* **Trợ lý văn hóa AI & Số hóa di sản 360°:** Gemini AI cung cấp lịch trình cá nhân hóa ít phát thải carbon và tư vấn quy tắc ứng xử văn hóa; Three.js cung cấp không gian tương tác 360° lưu trữ các di sản số hóa.

---

## 3. Các Smart Contracts cốt lõi (Core Contracts)

Các smart contract của dự án được triển khai bằng Solidity trong thư mục `contracts/src/`:

```
contracts/src/
├── EcoToken.sol                  # ERC-20 Reward Token
├── ImpactBadge.sol               # ERC-721 Proof of Action NFT
├── PaymentSplitter.sol           # Bộ chia doanh thu tự động D2C
├── Marketplace.sol               # Sàn giao dịch tour & đồ thủ công D2C
├── CommunityTreasury.sol         # Quỹ cộng đồng quản lý on-chain
├── Governance.sol                # DAO voting & quyết định giải ngân
└── interfaces/
    └── IMarketPlaceDeps.sol      # Giao diện kết nối phụ thuộc giữa các contract
```

### Chi tiết chức năng từng contract

| Contract | Chuẩn / Kế thừa | Chức năng chính |
| :--- | :--- | :--- |
| **`EcoToken.sol`** | `ERC-20`, `ERC20Capped`, `ERC20Burnable`, `AccessControl` | **Token phần thưởng tuần hoàn:**<br>• Capped supply tối đa 100,000,000 ECO.<br>• Phân quyền `MINTER_ROLE` chỉ cho phép `PaymentSplitter` / `Marketplace` mint thưởng.<br>• Cho phép người dùng burn token hoặc sử dụng làm quyền biểu quyết (voting power). |
| **`ImpactBadge.sol`** | `ERC-721`, `ERC721URIStorage`, `AccessControl` | **Chứng chỉ NFT ghi nhận hành động (Proof of Action):**<br>• Hỗ trợ các loại huy hiệu: `ECO_CHECKIN`, `ZERO_CARBON`, `CULTURE_GUARDIAN`, `COMMUNITY_DONOR`.<br>• Metadata lưu trữ phi tập trung trên IPFS chống giả mạo.<br>• Hỗ trợ tra cứu danh sách huy hiệu theo người sở hữu (`getBadgesByOwner`). |
| **`PaymentSplitter.sol`** | `Ownable`, `ReentrancyGuard` | **Hệ thống phân tách doanh thu tự động:**<br>• Cấu hình tỷ lệ theo Basis Points (`BPS = 10,000` = 100%): `artisanBPS` (70%), `treasuryBPS` (20%), `platformBPS` (10%).<br>• Chuyển tiền ngay lập tức cho nghệ nhân và Quỹ cộng đồng.<br>• Áp dụng mô hình Pull Pattern cho phí nền tảng (`withdrawPlatformFees`) để giảm thiểu rủi ro DoS/Reentrancy.<br>• Tự động mint thưởng `EcoToken` cho người mua theo tỷ lệ `ecoRewardRate`. |
| **`Marketplace.sol`** | `Ownable`, `ReentrancyGuard` | **Chợ trực tiếp D2C:**<br>• Cho phép nghệ nhân tạo danh sách bán sản phẩm/tour (`createListing`) với các phân loại (`Handicraft`, `Food`, `Experience`).<br>• Du khách thanh toán (`purchaseListing`), tiền được điều hướng qua `PaymentSplitter`, hoàn tiền thừa nếu gửi dư ETH.<br>• Tự động kích hoạt mint NFT `ImpactBadge` cho người mua. |
| **`CommunityTreasury.sol`** | `Ownable`, `ReentrancyGuard` | **Quỹ cộng đồng on-chain:**<br>• Nhận ETH tự động trích từ các giao dịch mua hàng hoặc đóng góp trực tiếp.<br>• Kiểm soát bảo mật: Chỉ duy nhất hợp đồng `Governance` được ủy quyền mới có quyền gọi `disburse()` để xuất tiền.<br>• Lưu trữ lịch sử giải ngân minh bạch on-chain (`Disbursement[]`). |
| **`Governance.sol`** | `Ownable`, `ReentrancyGuard` | **Hợp đồng biểu quyết DAO:**<br>• Cho phép tạo đề xuất giải ngân quỹ (`propose`) khi người dùng nắm giữ lượng `EcoToken` tối thiểu.<br>• Cơ chế snapshot số dư token tại `block.number - 1` chống thao túng phiếu bằng Flash-loan.<br>• Kiểm tra thời hạn bầu cử (`votingPeriod`) và túc số (`quorumBps`). Tự động kích hoạt `CommunityTreasury.disburse()` khi đề xuất được thông qua. |

---

## 4. Kiến trúc hệ thống & Luồng hoạt động (Workflow & Architecture)

### 4.1 Sơ đồ kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MYHOMELAB ECOSYSTEM                          │
├──────────────────┬──────────────────────┬───────────────────────────┤
│   FRONTEND LAYER │    AI ENGINE LAYER   │    BLOCKCHAIN LAYER        │
│                  │                      │                            │
│  Next.js 14      │  Gemini API          │  Solidity Contracts        │
│  (App Router)    │  (Edge Runtime)      │  (OpenZeppelin / Foundry)  │
│  TypeScript      │                      │                            │
│  Tailwind CSS    │  AI Travel Assistant │  • EcoToken (ERC-20)       │
│  Three.js        │  Culture Guide Bot   │  • ImpactBadge (ERC-721)   │
│  (360° Archive)  │  Itinerary Planner   │  • PaymentSplitter         │
│  Wagmi v2 / Viem │                      │  • Marketplace             │
│  ConnectKit      │  Digital Archive:    │  • CommunityTreasury       │
│  TanStack Query  │  360° Heritage View  │  • Governance (DAO)        │
└──────────────────┴──────────────────────┴───────────────────────────┘
```

### 4.2 Luồng tương tác của người dùng (End-to-End User Journey)

```
                            ┌──────────────────────────────┐
                            │   Gemini AI & 360° Archive   │
                            │ (Lịch trình xanh, di sản 3D) │
                            └──────────────┬───────────────┘
                                           │ Tham khảo
                                           ▼
[Du khách] ──────(1. Mua tour / đồ thủ công)────► [Marketplace.sol]
                                                          │
                                           (2. Chuyển tiền & gọi)
                                                          ▼
                                                [PaymentSplitter.sol]
                                       ┌──────────────────┼────────────────┐
                    (3a. Chia 70%)     │  (3b. Trích 20%) │ (3c. Giữ 10%)  │ (3d. Thưởng ECO)
                           ▼           ▼                  ▼                ▼
                      [Nghệ nhân] [CommunityTreasury]  [Platform Fees] [Du khách nhận ECO]
                                       ▲
                                       │ (5. Giải ngân sau biểu quyết)
                                       │
         [Cộng đồng / Holder] ──(4. Propose & Vote)──► [Governance.sol]
                 ▲
                 └───────── Nhận NFT ImpactBadge (Proof of Action) ◄─── [ImpactBadge.sol]
```

1. **Khám phá & Trải nghiệm:**
   - Du khách kết nối ví Web3 (MetaMask/WalletConnect), sử dụng AI Travel Assistant để xây dựng lịch trình du lịch bền vững và khám phá không gian di sản 360°.
2. **Đăng bán & Mua sắm D2C:**
   - Nghệ nhân đăng bán sản phẩm thủ công hoặc dịch vụ du lịch lên `Marketplace.sol`.
   - Du khách mua sản phẩm bằng đồng tiền native (ETH/SepoliaETH).
3. **Phân phối doanh thu & Khen thưởng tuần hoàn:**
   - Hợp đồng `Marketplace` gửi giá trị đơn hàng sang `PaymentSplitter`.
   - `PaymentSplitter` tự động chuyển 70% giá trị cho nghệ nhân, 20% nạp vào `CommunityTreasury` và giữ 10% phí nền tảng.
   - Du khách nhận được NFT `ImpactBadge` ghi nhận hành động mua hàng/tham gia tour, đồng thời nhận token `EcoToken` thưởng vào ví.
4. **Theo dõi Carbon & Hoàn thành nhiệm vụ:**
   - Du khách theo dõi và bù đắp lượng khí thải CO₂ qua công cụ tính toán phát thải, nhận huy hiệu `ZERO_CARBON`.
5. **Quản trị cộng đồng (DAO Governance):**
   - Người nắm giữ `EcoToken` tạo đề xuất tài trợ cho các sáng kiến bảo tồn di sản hoặc phục hồi rừng tại địa phương.
   - Cộng đồng tham gia biểu quyết theo tỷ lệ token sở hữu. Khi đề xuất đạt đa số và túc số, hợp đồng `Governance` kích hoạt giải ngân từ `CommunityTreasury` cho dự án.

---

## 5. Hướng dẫn cài đặt & Kiểm thử Smart Contracts

Dự án sử dụng bộ công cụ **Foundry** để biên dịch, kiểm thử và triển khai các smart contracts.

### Yêu cầu môi trường
* [Foundry](https://getfoundry.sh/) (`forge`, `cast`, `anvil`)
* [Node.js](https://nodejs.org/) (v18+)

### Các lệnh thao tác chính

```shell
# Di chuyển vào thư mục contracts
cd contracts

# Cài đặt dependencies (OpenZeppelin, forge-std)
forge install

# Biên dịch smart contracts
forge build

# Chạy toàn bộ bộ kiểm thử (Unit tests)
forge test

# Chạy kiểm thử chi tiết kèm log và trace
forge test -vvv

# Kiểm tra độ phủ mã nguồn (Coverage)
forge coverage
```

---

## 6. Lộ trình phát triển (Roadmap)

Chi tiết kế hoạch triển khai được quản lý tại [`docs/PLAN.md`](docs/PLAN.md):

- [x] **Giai đoạn 1:** Xây dựng lõi Smart Contracts (`EcoToken`, `ImpactBadge`, `PaymentSplitter`, `Marketplace`, `CommunityTreasury`, `Governance`) và Unit Test.
- [ ] **Giai đoạn 2:** Triển khai mạng cục bộ (Anvil), viết kịch bản mô phỏng E2E và deploy Sepolia Testnet.
- [ ] **Giai đoạn 3:** Xây dựng Next.js 14 Frontend, tích hợp Gemini AI Travel Assistant và kho lưu trữ di sản 360° (Three.js).
- [ ] **Giai đoạn 4:** Hoàn thiện giao diện D2C Marketplace, bảng điều khiển cá nhân, Carbon Tracker và hệ thống nhiệm vụ Eco Quest.
- [ ] **Giai đoạn 5:** Xây dựng giao diện DAO Governance, kiểm thử tự động toàn diện (Playwright E2E) và đánh giá hiệu năng/bảo mật.

---

## 7. Giấy phép (License)

Dự án được phân phối dưới giấy phép **MIT License**.
