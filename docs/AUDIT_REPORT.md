# AUDIT_REPORT.md — Performance, Accessibility & SEO (Task 5.3)

> Ngày đo: 2026-11-06 · Nhánh `feat/task-5.3-audit` · Lighthouse 12.8.2 (Chrome 156, headless)
> Bản build production (`next build && next start`), mạng Sepolia, chạy trên máy local (`localhost:3300`).
> **Mobile** = cấu hình mặc định của Lighthouse (Moto G Power, 4G chậm mô phỏng, CPU ×4). **Desktop** = `--preset=desktop`.

## 1. Kết quả

| Trang | Performance (mobile) | Accessibility | Best Practices | SEO | LCP (mobile) | CLS | TBT (mobile) | JS tải lúc vào trang | Desktop P / A / BP / SEO | LCP (desktop) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 81 → **98** | 95 → **100** | 100 → **100** | 100 → **100** | 4.5 s → 2.4 s | 0 | 190 ms → 50 ms | 671 → 331 KiB | 100 / 100 / 100 / 100 | 0.8 s |
| `/marketplace` | 79 → **94** | 96 → **100** | 100 → **100** | 100 → **100** | 5.1 s → 2.9 s | 0 | 170 ms → 90 ms | 663 → 319 KiB | 100 / 100 / 100 / 100 | 0.7 s |
| `/marketplace/1` | 73 → **72** | 96 → **100** | 100 → **79** | 100 → **100** | 5.8 s → 10.6 s | 0.005 | 180 ms → 170 ms | 667 → 324 KiB | 76 / 100 / 78 / 100 | 6.6 s |
| `/carbon-tracker` | 84 → **96** | 96 → **100** | 100 → **100** | 100 → **100** | 4.2 s → 2.8 s | 0 | 160 ms → 10 ms | 663 → 319 KiB | 100 / 100 / 100 / 100 | 0.6 s |
| `/quests` | 78 → **90** | 93 → **100** | 100 → **100** | 100 → **100** | 4.9 s → 3.5 s | 0 | 220 ms → 110 ms | 663 → 319 KiB | 100 / 100 / 100 / 100 | 0.7 s |
| `/governance` | 79 → **91** | 96 → **100** | 100 → **100** | 100 → **100** | 5.1 s → 3.5 s | 0.003 | 190 ms → 60 ms | 663 → 319 KiB | 100 / 100 / 100 / 100 | 0.7 s |
| `/dashboard` | 79 → **94** | 95 → **100** | 100 → **100** | 100 → **100** | 4.9 s → 3.0 s | 0 | 180 ms → 0 ms | 663 → 319 KiB | 100 / 100 / 100 / 100 | 0.6 s |

Cột "trước → sau" là số đo mobile; cột desktop chỉ đo sau khi sửa. "JS tải lúc vào trang" là tổng dung lượng script truyền qua mạng (đã nén). Điểm Performance dao động khoảng ±3 giữa các lần chạy. First Load JS theo `next build`: trang chủ 444 → 121 kB, các trang khác ~494 → ~232 kB.

### Đối chiếu DoD

| Tiêu chí | Kết quả |
| --- | --- |
| Lighthouse Performance ≥ 85 | ✅ 6/7 trang: mobile 90–98, desktop 100. ⚠️ `/marketplace/[id]`: mobile 72, desktop 76 (ảnh IPFS, xem 3.2) |
| Lighthouse Accessibility ≥ 90 | ✅ 100 ở mọi trang (mobile và desktop) |
| Lighthouse SEO ≥ 90 | ✅ 100 ở mọi trang |
| No broken images trên production build | ✅ Không có request ảnh nào lỗi; đã xoá 3 đường dẫn `/destinations/*.jpg` trỏ tới file không tồn tại (trường không được hiển thị ở đâu) |
| LCP < 2.5 s | ✅ Desktop 0.6–0.8 s. Mobile mô phỏng: trang chủ 2.4 s ✅; các trang khác 2.8–3.5 s ⚠️; `/marketplace/[id]` 10.6 s ⚠️ |
| CLS < 0.1 | ✅ ≤ 0.005 (mobile), ≤ 0.009 (desktop) |
| FID < 100 ms | Lighthouse (lab) không đo FID/INP. Chỉ số thay thế TBT: 0–110 ms mobile (6/7 trang), 0 ms desktop ✅ |

## 2. Đã sửa

### Performance
- **ConnectKit tải theo yêu cầu (thay đổi lớn nhất).** ConnectKit (modal + framer-motion + qrcode) từng nằm trong `Web3Provider` ở layout gốc, nên mọi trang đều tải nó. Giờ:
  - `src/providers/WalletModal.tsx`: `WalletModalProvider` + `useWalletModal().open()` thay cho `useModal()` của ConnectKit. Lần mở đầu tiên `import()` file `ConnectKitLayer.tsx`, gắn `ConnectKitProvider` cạnh app (vẫn nằm trong `WagmiProvider`) rồi mở modal.
  - `src/components/layout/ConnectWalletButton.tsx`: nút nhẹ thay `ConnectKitButton` (hiển thị "Connect Wallet" hoặc `0x7099••••79C8` kèm avatar gradient). Rê chuột hoặc focus vào nút sẽ tải trước ConnectKit.
  - Lưu ý khi viết: `ModalOpener` chỉ mở modal một lần cho mỗi lần `open()`, và lùi sang tick sau. Nếu mở ngay trong effect, ConnectKitProvider (effect của cha chạy sau effect của con) sẽ reset lệnh mở; còn nếu mở lại mỗi khi `setOpen` đổi identity thì modal bị đưa về màn hình đầu sau khi chọn ví. E2E đã bắt được cả hai lỗi này.
  - Kết quả: JS tải lúc vào trang giảm từ ~663 xuống ~319 KiB, Performance mobile từ 81–87 lên 90–98.
- **WalletConnect không còn tải khi vào trang.** wagmi gọi `getProvider()` của mọi connector khi khởi tạo (`setup()`) và khi `reconnect()`, nên SDK WalletConnect (~400 KiB, chunk `@walletconnect/*` + `@reown/*`) bị tải và mở kết nối relay cho mọi người dùng. `src/config/wagmi.ts` bọc connector bằng `lazyWalletConnect`: chỉ tải khi người dùng chọn WalletConnect (`connect()`), hoặc khi lần kết nối gần nhất là WalletConnect (để vẫn khôi phục phiên). Đã kiểm tra: trang chủ không còn tải chunk này.
- **Trang chủ tải động 2 tab ít dùng** (`CultureGuideSection`, `ArchiveGallery`) bằng `next/dynamic`: page chunk 15.2 kB → 7.6 kB. Three.js vốn đã được tách riêng (`DigitalArchive360` dùng `next/dynamic`, `ssr: false`).
- **Sửa lỗi trang chủ tự cuộn xuống khi vừa tải:** `TravelAssistant` gọi `scrollIntoView()` trên khung chat, nên cả trang cuộn qua phần hero. Giờ chỉ cuộn bên trong khung chat, và chỉ khi đã có tin nhắn.
- **`next/image`** cho ảnh sản phẩm (`ListingImage`) và ảnh badge (`BadgeCard`), kèm `sizes`. Ảnh ở trang chi tiết dùng `priority`. Loader `src/lib/image-loader.ts` xin ảnh đúng kích thước dạng WebP từ **cổng Pinata riêng** (`*.mypinata.cloud`, qua tham số `img-width`). Với các nguồn khác (cổng công khai, `data:` URI) ảnh được phục vụ nguyên bản (`unoptimized`), vì cổng công khai `gateway.pinata.cloud` bỏ qua tham số resize (đã kiểm tra: trả về cùng file JPEG 72 KB).

### Accessibility (93–96 → 100)
- **Độ tương phản màu (WCAG AA ≥ 4.5:1):** chữ trắng trên `bg-emerald-600` (3.76:1) → `bg-emerald-700` (5.48:1), hover `emerald-500` → `emerald-600`; chữ phụ `text-slate-500` (3.1–4.2:1 trên nền tối) → `text-slate-400` (≥ 5.7:1). Áp dụng cho 27 file.
- **Thứ tự heading:** trang chủ chưa có `h1` (hero dùng `h2`) → đổi thành `h1`, thẻ "On-chain Ecosystem Contracts" `h3` → `h2`. Trang Quests nhảy từ `h1` xuống `h3` → thêm `h2` ẩn "Danh sách quest" cho lưới quest.
- Nút chọn tab ở trang chủ có `type="button"` và `aria-pressed`. Skeleton của tab tải động có `role="status"` + `aria-label`.

### SEO
- `src/lib/seo.ts`: `metadataBase` (`NEXT_PUBLIC_SITE_URL` → domain production của Vercel → `localhost`), title template `%s — MyHomeLab`, `pageMetadata()` đặt canonical + OpenGraph + Twitter card cho từng trang. Lý do: `openGraph` của trang con thay thế hoàn toàn object của trang cha, nên mỗi trang phải tự đặt đủ.
- Trang chi tiết `/marketplace/[listingId]` và `/governance/[proposalId]` có `generateMetadata` riêng (canonical theo ID); trước đây chúng kế thừa canonical của trang danh sách.
- Ảnh OpenGraph 1200×630 tạo bằng `next/og` (`src/app/opengraph-image.tsx`, Edge runtime), áp dụng cho mọi trang.
- `/sitemap.xml` (`src/app/sitemap.ts`) và `/robots.txt` (`src/app/robots.ts`, chặn `/api/`).
- `viewport`: `themeColor`, `colorScheme: dark`.

### Security headers (`next.config.mjs`)
- **Content-Security-Policy:** `default-src 'self'`; `script-src 'self' 'unsafe-inline'` (cộng `'unsafe-eval'` chỉ khi dev); `style-src 'self' 'unsafe-inline'`; `img-src 'self' data: blob: https:`; `connect-src 'self' https: wss: http://127.0.0.1:8545`; `frame-src` chỉ cho trang verify của WalletConnect; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`.
- Đã có sẵn từ trước: `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Thêm `Cross-Origin-Opener-Policy: same-origin-allow-popups` (popup của ví) và `Strict-Transport-Security` (chỉ có hiệu lực qua HTTPS).
- Kiểm chứng: Best Practices 100 (không có lỗi CSP trong console) và E2E 9/9 pass, bao gồm kết nối ví, RPC Anvil, ảnh, giao dịch.

## 3. Việc còn tồn đọng

### 3.1 LCP mobile của các trang có dữ liệu on-chain (2.8–3.5 s)
Phần JS còn lại (~319 KiB) chủ yếu là viem + wagmi + react-query. Các trang đó cần chúng để đọc dữ liệu on-chain ngay khi vào trang. Muốn hạ thêm cần đọc dữ liệu on-chain trên server (React Server Components) để trang render được mà không phải chờ wagmi.

### 3.2 `/marketplace/[listingId]` (mobile 72, desktop 76; Best Practices 78–79)
- LCP của trang là ảnh sản phẩm trên IPFS. Ảnh phải chờ một chuỗi bước (JS → đọc listing on-chain → tải metadata IPFS → tải ảnh), và cổng công khai `gateway.pinata.cloud` mất ~4–6 s cho mỗi file. Trước khi sửa, ảnh dùng `loading="lazy"` và không được tính là LCP, nên con số cũ (5.8 s, chữ `h1`) thấp hơn thực tế.
- Best Practices bị trừ điểm vì cookie bên thứ ba `_cfuvid` do Cloudflare của cổng Pinata công khai đặt (cookie này có cả khi không gửi tham số resize).
- **Khắc phục:** dùng cổng Pinata riêng (`NEXT_PUBLIC_IPFS_GATEWAY=https://<tên>.mypinata.cloud/ipfs/`): nhanh hơn, loader tự resize sang WebP. Có thể thêm việc đọc listing và metadata trên server (`generateMetadata`/RSC) để bỏ bớt chuỗi phụ thuộc phía client.

### 3.3 Khác
- Khi người dùng mở modal ví, ConnectKit có tải thêm chunk WalletConnect (do chính ConnectKit nạp). Việc này chỉ xảy ra sau thao tác của người dùng, không ảnh hưởng tốc độ tải trang.
- Ảnh OpenGraph chỉ dùng chữ không dấu: font mặc định của `next/og` không có dấu tiếng Việt. Muốn có dấu cần nhúng thêm font (ví dụ Be Vietnam Pro) vào `opengraph-image.tsx`.
- `next.config.ts` (như PLAN ghi) cần Next ≥ 15; dự án đang dùng Next 14 nên cấu hình vẫn ở `next.config.mjs`.
- `public/sitemap.xml` được thay bằng `src/app/sitemap.ts`, vẫn phục vụ tại `/sitemap.xml` và tự lấy domain từ biến môi trường.
- Khi deploy (Task 5.4) cần đặt `NEXT_PUBLIC_SITE_URL`, hoặc để Vercel tự cung cấp `VERCEL_PROJECT_PRODUCTION_URL`, để canonical, OpenGraph và sitemap dùng đúng domain.

## 4. Cách đo lại

```bash
cd frontend
npm run build && npx next start -p 3300
npx lighthouse@12.8.2 http://localhost:3300/ --only-categories=performance,accessibility,best-practices,seo --view
npx lighthouse@12.8.2 http://localhost:3300/ --preset=desktop --view
```
