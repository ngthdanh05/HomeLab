// Câu hỏi gợi ý về biển đảo: dùng ở ô hỏi nhanh trên trang chủ và trong Trợ lý biển (/assistant).
import { pick, type Locale } from "../lib/i18n.ts";

const VI = [
  "Mùa nào lặn ngắm san hô ở Hòn Mun đẹp nhất?",
  "Đi biển đảo cần chuẩn bị gì để không xả rác nhựa?",
  "Kem chống nắng nào an toàn cho rạn san hô?",
  "Gợi ý lịch trình 3 ngày Cù Lao Chàm ít phát thải",
] as const;

const EN = [
  "When is the best season to snorkel the coral at Hon Mun?",
  "How do I pack for an island trip without single-use plastic?",
  "Which sunscreens are safe for coral reefs?",
  "Suggest a low-carbon 3-day itinerary for Cu Lao Cham",
] as const;

export function getOceanQuestions(locale: Locale): readonly string[] {
  return pick<readonly string[]>(locale, VI, EN);
}

/** Độ dài tối đa của câu hỏi gửi qua URL `/assistant?q=` (khớp giới hạn tin nhắn chat). */
export const ASSISTANT_QUERY_MAX_LENGTH = 500;
