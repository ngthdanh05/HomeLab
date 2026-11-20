// Mẫu đề xuất dự án bảo tồn biển: gợi ý trong form "Tạo đề xuất" và ở trạng thái trống của Quỹ.
// Chỉ là nội dung điền sẵn; số ETH và ví nhận do người đề xuất tự kiểm tra lại.
import type { Locale } from "../lib/i18n.ts";

export interface ProposalTemplate {
  key: string;
  title: string;
  body: string;
  /** Số ETH gợi ý (chuỗi như người dùng gõ). */
  amount: string;
  en: { title: string; body: string };
}

export const PROPOSAL_TEMPLATES: readonly ProposalTemplate[] = [
  {
    key: "coral-mooring-buoys",
    title: "Tài trợ phao neo bảo vệ rạn san hô Hòn Mun",
    body: "Lắp 20 phao neo cố định để tàu du lịch không thả neo lên rạn san hô. Ngư dân làng Bích Đầm thi công và bảo dưỡng phao trong 2 năm, báo cáo ảnh rạn mỗi quý.",
    amount: "0.2",
    en: {
      title: "Mooring buoys to protect the Hon Mun coral reef",
      body: "Install 20 fixed mooring buoys so tour boats stop dropping anchor on the reef. Fishers from Bich Dam village build and maintain them for 2 years, with quarterly reef photos.",
    },
  },
  {
    key: "ghost-net-cleanup",
    title: "Thu gom lưới ma vùng biển ven bờ Cù Lao Chàm",
    body: "Hỗ trợ 12 thợ lặn và 4 thuyền cá thu gom lưới bỏ hoang trên rạn trong 3 tháng. Lưới thu được giao cho nghệ nhân địa phương tái chế thành đồ thủ công.",
    amount: "0.15",
    en: {
      title: "Ghost net clean-up along the Cu Lao Cham coast",
      body: "Fund 12 divers and 4 fishing boats to remove abandoned nets from the reef for 3 months. The nets go to local artisans to be recycled into crafts.",
    },
  },
  {
    key: "seagrass-restoration",
    title: "Phục hồi thảm cỏ biển Bãi Bổn, Phú Quốc",
    body: "Trồng lại 1 ha cỏ biển, nơi kiếm ăn của bò biển và rùa biển, cùng nhóm ngư dân tuần tra cộng đồng. Theo dõi độ phủ cỏ biển 6 tháng một lần.",
    amount: "0.1",
    en: {
      title: "Seagrass restoration at Bai Bon, Phu Quoc",
      body: "Replant 1 ha of seagrass, a feeding ground for dugongs and sea turtles, with a community fishers' patrol. Seagrass cover is surveyed every 6 months.",
    },
  },
];

export function localizeTemplate(template: ProposalTemplate, locale: Locale): { title: string; body: string; amount: string } {
  return locale === "en"
    ? { title: template.en.title, body: template.en.body, amount: template.amount }
    : { title: template.title, body: template.body, amount: template.amount };
}
