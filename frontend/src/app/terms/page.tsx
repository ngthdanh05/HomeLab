import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: pick(locale, "Điều khoản sử dụng", "Terms of Use"),
    description: pick(
      locale,
      "Điều khoản sử dụng bản thử nghiệm MyHomeLab trên testnet.",
      "Terms of use for the MyHomeLab testnet preview.",
    ),
    path: "/terms",
    locale,
  });
}

export default async function TermsPage() {
  const locale = await getLocale();
  if (locale === "en") {
    return (
      <LegalPage title="Terms of Use">
        <h2>1. Service status</h2>
        <p>
          MyHomeLab runs on a test network. Testnet ETH, ECO and ImpactBadge in this version have no monetary value. The smart
          contracts have not been independently audited. Do not send real assets to the project&apos;s addresses.
        </p>
        <h2>2. Blockchain transactions</h2>
        <ul>
          <li>You manage your own wallet and private keys; we cannot recover or reverse transactions.</li>
          <li>When you buy, the money is held in escrow until you confirm delivery or the deadline shown on the order passes.</li>
          <li>Disputes are handled by the arbiter address appointed by the platform.</li>
        </ul>
        <h2>3. Sellers</h2>
        <p>
          Only verified artisan wallets can list products. Sellers are responsible for the accuracy of their products, delivery
          and their own legal obligations.
        </p>
        <h2>4. Carbon offsets</h2>
        <p>
          Offset fees go to the DAO-managed Community Treasury. They are not currently tied to verified carbon credits, and the
          badge only records your contribution.
        </p>
        <h2>5. ECO token</h2>
        <p>ECO is used for voting in the DAO. ECO is not an investment and promises no profit.</p>
        <h2>6. AI content</h2>
        <p>AI-generated suggestions can be wrong. Check important information before making decisions.</p>
      </LegalPage>
    );
  }

  return (
    <LegalPage title="Điều khoản sử dụng">
      <h2>1. Tình trạng dịch vụ</h2>
      <p>
        MyHomeLab đang chạy trên mạng thử nghiệm. ETH testnet, ECO và ImpactBadge trong bản này không có giá trị tiền tệ.
        Smart contract chưa được kiểm toán độc lập. Không gửi tài sản thật vào các địa chỉ của dự án.
      </p>
      <h2>2. Giao dịch trên blockchain</h2>
      <ul>
        <li>Bạn tự quản lý ví và khoá riêng; chúng tôi không thể khôi phục hay đảo ngược giao dịch.</li>
        <li>Khi mua hàng, tiền được giữ trong escrow tới khi bạn xác nhận hoặc hết thời hạn hiển thị trên đơn hàng.</li>
        <li>Khiếu nại được xử lý bởi địa chỉ trọng tài do nền tảng chỉ định.</li>
      </ul>
      <h2>3. Người bán</h2>
      <p>
        Chỉ ví nghệ nhân đã được xác thực mới đăng bán được. Người bán chịu trách nhiệm về tính chính xác của sản phẩm, việc
        giao hàng và nghĩa vụ pháp lý của mình.
      </p>
      <h2>4. Bù đắp carbon</h2>
      <p>
        Phí bù đắp được chuyển vào Quỹ Cộng đồng do DAO quản lý. Khoản này hiện chưa gắn với tín chỉ carbon đã được kiểm định,
        và badge chỉ ghi nhận đóng góp của bạn.
      </p>
      <h2>5. Token ECO</h2>
      <p>ECO dùng để biểu quyết trong DAO. ECO không phải khoản đầu tư và không hứa hẹn lợi nhuận.</p>
      <h2>6. Nội dung AI</h2>
      <p>Gợi ý do AI tạo ra có thể sai. Hãy kiểm tra lại thông tin quan trọng trước khi quyết định.</p>
    </LegalPage>
  );
}
