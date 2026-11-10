import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: pick(locale, "Chính sách riêng tư", "Privacy Policy"),
    description: pick(
      locale,
      "Cách bản thử nghiệm MyHomeLab xử lý dữ liệu của bạn.",
      "How the MyHomeLab testnet preview handles your data.",
    ),
    path: "/privacy",
    locale,
  });
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  if (locale === "en") {
    return (
      <LegalPage title="Privacy Policy">
        <h2>1. Public data on the blockchain</h2>
        <p>
          Wallet addresses, transactions, proposals, votes and badge metadata are recorded publicly and cannot be deleted. Do not
          enter personal information in product descriptions, proposals or trip details.
        </p>
        <h2>2. Content sent to AI</h2>
        <p>Questions and trip descriptions are sent to Google Gemini to generate answers. The app does not store chat history on its servers.</p>
        <h2>3. Product images and information</h2>
        <p>Product images and descriptions are uploaded to IPFS through Pinata and may persist on the decentralized network.</p>
        <h2>4. Technical data</h2>
        <ul>
          <li>IP addresses and wallet addresses are used temporarily to limit API request rates.</li>
          <li>Your browser stores your wallet connection state, your language choice and the list of heritage sites you have viewed.</li>
          <li>RPC providers and IPFS gateways receive your IP address when your browser calls them.</li>
        </ul>
      </LegalPage>
    );
  }

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
        <li>Trình duyệt lưu trạng thái kết nối ví, ngôn ngữ đã chọn và danh sách di sản đã xem.</li>
        <li>Nhà cung cấp RPC và cổng IPFS nhận địa chỉ IP của bạn khi trình duyệt gọi tới họ.</li>
      </ul>
    </LegalPage>
  );
}
