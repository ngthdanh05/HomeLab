# 🚀 Smart Contract Deployment Records

Tài liệu lưu trữ thông tin triển khai, địa chỉ hợp đồng và hướng dẫn tương tác với hệ thống Smart Contract của nền tảng **Eco-Tourism & Handicraft D2C**.

---

## 📌 Danh sách Smart Contracts

| STT | Contract Name | Mô tả |
| :---: | :--- | :--- |
| **1** | `EcoToken` (`ECO`) | ERC-20 token thưởng tuần hoàn, capped 100M ECO, hỗ trợ snapshot voting (`ERC20Votes`). |
| **2** | `ImpactBadge` (`IMPACT`) | ERC-721 NFT Proof-of-Action ghi nhận đóng góp tích cực cho môi trường và văn hóa. |
| **3** | `CommunityTreasury` | Quỹ bảo tồn cộng đồng tiếp nhận 20% doanh thu và giải ngân theo quyết định DAO. |
| **4** | `Governance` | DAO voting on-chain kiểm soát việc tạo proposal và giải ngân từ `CommunityTreasury`. |
| **5** | `PaymentSplitter` | Hợp đồng chia sẻ doanh thu D2C tự động (70% Nghệ nhân, 20% Quỹ, 10% Platform) & thưởng ECO. |
| **6** | `Marketplace` | Sàn giao dịch tour trải nghiệm và đồ thủ công giữa nghệ nhân & du khách. |
| **7** | `CarbonOffset` | Du khách bù đắp CO₂ chuyến đi: phí theo kg vào `CommunityTreasury`, nhận NFT `ZERO_CARBON` (Task 4.3). |
| **8** | `QuestRewards` | Eco Quest: kiểm tra điều kiện on-chain, thưởng ECO + badge hiếm, mỗi quest một lần/ví (Task 4.4). |

---

## 🌐 1. Local Anvil Deployment (Chain ID: `31337`)

> Các địa chỉ được sinh tự động sau khi chạy lệnh: `make deploy-local`  
> Lưu trữ tại file: `deployments/local.json`

| Contract | Địa chỉ Local mặc định (Anvil Account #0 Deployer) |
| :--- | :--- |
| **EcoToken** | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| **ImpactBadge** | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| **CommunityTreasury** | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| **Governance** | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |
| **PaymentSplitter** | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` |
| **Marketplace** | `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` |
| **CarbonOffset** | `0x0165878A594ca255338adfa4d48449f69242Eb8F` |
| **QuestRewards** | `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853` |

---

## 🌍 2. Sepolia Testnet Deployment (Chain ID: `11155111`)

> Tự động ghi nhận sau khi chạy lệnh: `make deploy-sepolia`  
> Lưu trữ tại file: `deployments/sepolia.json`

| Contract | Địa chỉ trên Sepolia | Etherscan Link |
| :--- | :--- | :--- |
| **EcoToken** | `0xacB3267dBBeA4924cEE9e5631618DB8342f39a24` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/0xacB3267dBBeA4924cEE9e5631618DB8342f39a24) |
| **ImpactBadge** | `0xba5404682DB9feb35fBB1cbC18b97f1A59b7a9C9` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/0xba5404682DB9feb35fBB1cbC18b97f1A59b7a9C9) |
| **CommunityTreasury** | `0x10E83c02C8667485EDd78ce57E0f6553D33296e6` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/0x10E83c02C8667485EDd78ce57E0f6553D33296e6) |
| **Governance** | `0x1e0404A2EDC3BB2139A82d2e8372631A11697998` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/0x1e0404A2EDC3BB2139A82d2e8372631A11697998) |
| **PaymentSplitter** | `0x5d574343A7e162Be9f3eA9Da676169d7Df874a66` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/0x5d574343A7e162Be9f3eA9Da676169d7Df874a66) |
| **Marketplace** | `0x92e554039D39014A5Fc55b31B1308f9DFe1098D5` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/0x92e554039D39014A5Fc55b31B1308f9DFe1098D5) |
| **CarbonOffset** | `0x4d51Ea6E0ACeBeBa0b96a72655B10457d769DFF5` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/0x4d51Ea6E0ACeBeBa0b96a72655B10457d769DFF5) |
| **QuestRewards** | `0x562845c0bd4F75e1d90207357A57f8aFA8f06F05` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/0x562845c0bd4F75e1d90207357A57f8aFA8f06F05) |

---

> **Lưu ý (2026-11-03):** Marketplace cũ `0x20b00321Fe96B07817F6C8b0CD197F719d856983` bị deploy sai tham số constructor
> (`paymentSplitter` trỏ vào EcoToken, `owner` là contract PaymentSplitter) nên không thể sửa được. Đã deploy lại Marketplace mới ở trên,
> cấp `MINTER_ROLE` trên ImpactBadge cho Marketplace mới và thu hồi `MINTER_ROLE` của Marketplace cũ trên cả ImpactBadge và EcoToken.

---
> **Lưu ý (2026-11-05):** Sửa lỗi thưởng ECO (trước đây ECO được mint cho Marketplace thay vì người mua):
> `IPaymentSplitter.splitPayment` nhận thêm địa chỉ `buyer`. Đã deploy lại PaymentSplitter và Marketplace (địa chỉ ở bảng trên),
> cấp `MINTER_ROLE` (EcoToken → PaymentSplitter mới, ImpactBadge → Marketplace mới) và thu hồi quyền của bản cũ
> (PaymentSplitter `0x703B08397D144cCA8208E5dAf29ec8CfFFb49A6a`, Marketplace `0x43085F8015bDc47b1Ca334A502eF3a4F07878894`).

---
> **Lưu ý (2026-11-05):** CarbonOffset deploy bằng `make deploy-carbon-sepolia` (block 12068939, giá 0.00001 ETH/kg),
> đã cấp `MINTER_ROLE` trên ImpactBadge. Lần deploy đầu `0x3CE5Da18f5fCf877d483e166A342398c70ddf467` **thất bại (out of gas)**:
> forge 1.7.1 giả lập cục bộ chỉ ước tính ~828k gas, trong khi Sepolia hiện tính ~4,2M gas cho giao dịch tạo contract này.
> Target trong Makefile đã thêm `--skip-simulation` để lấy gas từ `eth_estimateGas` của RPC. Nếu `make deploy-sepolia` (đủ 6 contract)
> cũng bị out of gas thì thêm cờ này tương tự.

---
> **Lưu ý (2026-11-05):** QuestRewards deploy bằng `make deploy-quests-sepolia` (block 12069700, đã verify), nạp 6 quest mặc định
> (`script/QuestSetup.sol`) và cấp `MINTER_ROLE` trên EcoToken + ImpactBadge. Cần `CARBON_OFFSET_ADDRESS` trong `contracts/.env`.

---

## ⚙️ Thiết lập quyền (Roles & Permissions) sau Deploy

1. **`EcoToken`**:
   - `MINTER_ROLE` được cấp cho `PaymentSplitter` (để tự động mint ECO thưởng khi du khách mua hàng).
   - `MINTER_ROLE` được cấp cho `Marketplace`.
   - `MINTER_ROLE` được cấp cho `QuestRewards` (thưởng ECO khi hoàn thành quest).
2. **`ImpactBadge`**:
   - `MINTER_ROLE` được cấp cho `Marketplace` (để tự động mint NFT Proof-of-Action cho người mua).
   - `MINTER_ROLE` được cấp cho `CarbonOffset` (mint `ZERO_CARBON` khi du khách bù đắp carbon).
   - `MINTER_ROLE` được cấp cho `QuestRewards` (badge hiếm khi hoàn thành quest; không bao giờ mint `ECO_CHECKIN` vì loại này là bằng chứng mua hàng).
3. **`CommunityTreasury`**:
   - `setGovernance`: Địa chỉ `Governance` được thiết lập là caller duy nhất có quyền gọi `disburse()`.

---

## 🛠️ Hướng dẫn tương tác nhanh (Commands)

### 1. Build & Test
```bash
make build
make test
```

### 2. Deploy lên Anvil Local & Chạy mô phỏng E2E
```bash
# Terminal 1: Khởi động local node
anvil

# Terminal 2: Deploy và chạy toàn bộ quy trình tương tác
make deploy-local
make simulate-e2e
```

### 3. Deploy & Verify lên Sepolia Testnet
Thiết lập `.env`:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```
Thực thi lệnh:
```bash
make deploy-sepolia
make verify-sepolia
```

---

## ▲ 4. Frontend trên Vercel (Task 5.4)

| Môi trường | URL | Cách deploy |
| --- | --- | --- |
| Production | **https://myhomelab.vercel.app** (project `myhomelab`, team `danhkhongus-projects`) | Push lên `main` → `.github/workflows/deploy.yml` chạy test (contracts, frontend, E2E) → `vercel deploy --prebuilt --prod` |
| Preview | Mỗi PR một URL, bot comment vào PR | Mở/cập nhật PR → test → `vercel deploy --prebuilt` |

Vercel **không** tự deploy theo Git (`"git": { "deploymentEnabled": false }` trong `frontend/vercel.json`): mọi bản deploy đều đi qua GitHub Actions, nên chỉ code đã pass test mới lên production. Region serverless: `sin1` (Singapore). Các route AI (Edge) cũng ghim `preferredRegion = "sin1"`: Gemini API không phục vụ một số edge location (ví dụ `hkg1`, Hong Kong), khiến request bị treo tới khi Vercel cắt ở 25 s.

### Thiết lập một lần

1. **Tạo và liên kết project** (trong thư mục `frontend/`; *Root Directory* của project để mặc định):
   ```bash
   cd frontend
   npx vercel@65.12.1 login
   npx vercel@65.12.1 link --yes --project myhomelab
   ```
   Lệnh `link` tạo `frontend/.vercel/project.json` (đã gitignore), chứa `orgId` và `projectId`.
2. **Biến môi trường trên Vercel** (Settings → Environment Variables, cho Production và Preview):

   | Biến | Bắt buộc | Ghi chú |
   | --- | --- | --- |
   | `NEXT_PUBLIC_CHAIN_ID` | ✅ | `11155111` |
   | `GEMINI_API_KEY` | ✅ | chỉ dùng phía server |
   | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ | thêm domain Vercel vào allowlist của project trên cloud.reown.com |
   | `NEXT_PUBLIC_SEPOLIA_RPC_URL` | khuyến nghị | endpoint **Sepolia**; giới hạn domain của API key trong dashboard Alchemy |
   | `PINATA_JWT` | tuỳ chọn | để đăng bán kèm ảnh |
   | `NEXT_PUBLIC_IPFS_GATEWAY` | khuyến nghị | cổng Pinata riêng `https://<tên>.mypinata.cloud/ipfs/` (nhanh hơn, có resize ảnh) |
   | `NEXT_PUBLIC_SITE_URL` | khuyến nghị | domain production, cho canonical/OpenGraph/sitemap |
   | `UPSTASH_REDIS_REST_URL` / `_TOKEN` | khuyến nghị | rate limit dùng chung; hoặc cài Upstash từ Vercel Marketplace (`KV_REST_API_*`) |
   | `GEMINI_MODEL` | tuỳ chọn | mặc định `gemini-3.8-flash` |
3. **GitHub secrets** (repo → Settings → Secrets and variables → Actions):
   - `VERCEL_TOKEN`: tạo ở Vercel → Account Settings → Tokens;
   - `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`: lấy trong `frontend/.vercel/project.json`.

   Thiếu các secret này thì workflow vẫn chạy test, còn bước deploy được bỏ qua kèm thông báo.
