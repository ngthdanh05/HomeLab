import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Chính sách riêng tư",
  description: "Cách bản thử nghiệm MyHomeLab xử lý dữ liệu của bạn.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage title="Chính sách riêng tư">
      <h2>1. Dữ liệu công khai trên blockchain</h2>
      <p>
        Địa chỉ ví, giao dịch, đề xuất, phiếu bầu và metadata badge được ghi công khai và không thể xoá. Đừng nhập thông tin
        cá nhân vào mô tả sản phẩm, đề xuất hay chuyến đi.
      </p>
      <h2>2. Nội dung gửi cho AI</h2>
      <p>
        Câu hỏi và mô tả hành trình được gửi tới Google Gemini để tạo câu trả lời. Ứng dụng không lưu lịch sử chat trên máy chủ.
      </p>
      <h2>3. Ảnh và thông tin sản phẩm</h2>
      <p>Ảnh và mô tả sản phẩm được đưa lên IPFS qua Pinata và có thể tồn tại lâu dài trên mạng phi tập trung.</p>
      <h2>4. Dữ liệu kỹ thuật</h2>
      <ul>
        <li>Địa chỉ IP và địa chỉ ví được dùng tạm để giới hạn tần suất gọi API.</li>
        <li>Trình duyệt lưu trạng thái kết nối ví và danh sách di sản đã xem.</li>
        <li>Nhà cung cấp RPC và cổng IPFS nhận địa chỉ IP của bạn khi trình duyệt gọi tới họ.</li>
      </ul>
    </LegalPage>
  );
}
