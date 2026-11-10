import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Điều khoản sử dụng",
  description: "Điều khoản sử dụng bản thử nghiệm MyHomeLab trên testnet.",
  path: "/terms",
});

export default function TermsPage() {
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
