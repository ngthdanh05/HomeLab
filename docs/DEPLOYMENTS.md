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

---

## 🌍 2. Sepolia Testnet Deployment (Chain ID: `11155111`)

> Tự động ghi nhận sau khi chạy lệnh: `make deploy-sepolia`  
> Lưu trữ tại file: `deployments/sepolia.json`

| Contract | Địa chỉ trên Sepolia | Etherscan Link |
| :--- | :--- | :--- |
| **EcoToken** | `[SEPOLIA_ECO_TOKEN_ADDRESS]` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/[SEPOLIA_ECO_TOKEN_ADDRESS]) |
| **ImpactBadge** | `[SEPOLIA_IMPACT_BADGE_ADDRESS]` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/[SEPOLIA_IMPACT_BADGE_ADDRESS]) |
| **CommunityTreasury** | `[SEPOLIA_TREASURY_ADDRESS]` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/[SEPOLIA_TREASURY_ADDRESS]) |
| **Governance** | `[SEPOLIA_GOVERNANCE_ADDRESS]` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/[SEPOLIA_GOVERNANCE_ADDRESS]) |
| **PaymentSplitter** | `[SEPOLIA_PAYMENT_SPLITTER_ADDRESS]` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/[SEPOLIA_PAYMENT_SPLITTER_ADDRESS]) |
| **Marketplace** | `[SEPOLIA_MARKETPLACE_ADDRESS]` | [Xem trên Sepolia Etherscan](https://sepolia.etherscan.io/address/[SEPOLIA_MARKETPLACE_ADDRESS]) |

---

## ⚙️ Thiết lập quyền (Roles & Permissions) sau Deploy

1. **`EcoToken`**:
   - `MINTER_ROLE` được cấp cho `PaymentSplitter` (để tự động mint ECO thưởng khi du khách mua hàng).
   - `MINTER_ROLE` được cấp cho `Marketplace`.
2. **`ImpactBadge`**:
   - `MINTER_ROLE` được cấp cho `Marketplace` (để tự động mint NFT Proof-of-Action cho người mua).
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
