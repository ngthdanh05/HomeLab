import { pick, type Locale } from "../lib/i18n.ts";
import { CULTURAL_EN } from "./culturalData.en.ts";

export interface CulturalDestination {
  id: string;
  name: string;
  region: string;
  description: string;
  dos: string[];
  donts: string[];
  phrases: { phrase: string; meaning: string; pronunciation: string }[];
  customs: string[];
  localFood: string[];
  bestTime: string;
  carbonTip: string;
}

export const culturalDestinations: CulturalDestination[] = [
  {
    id: "hoi-an",
    name: "Hội An",
    region: "Miền Trung",
    description:
      "Phố cổ Hội An - Di sản văn hóa thế giới UNESCO với kiến trúc cổ kính và làng nghề truyền thống",
    dos: [
      "Mặc trang phục kín đáo khi vào chùa và hội quán",
      "Hỏi trước khi chụp ảnh người dân địa phương",
      "Mua sắm tại các cửa hàng thủ công truyền thống",
      "Thuê xe đạp để khám phá phố cổ thân thiện môi trường",
      "Thử mặc áo dài tại các tiệm may phố cổ",
      "Tham gia tour đèn lồng và thả đèn hoa đăng",
    ],
    donts: [
      "Không chụp ảnh bên trong các nhà cổ khi không được phép",
      "Không mặc shorts ngắn hoặc áo không tay vào đền thờ",
      "Không mặc cả khi đèn lồng trong phố cổ - gây ô nhiễm nước",
      "Không trả giá quá thấp với các nghệ nhân - tôn trọng lao động của họ",
      "Không sử dụng túi nhựa - ủng hộ phong trào không rác thải",
    ],
    phrases: [
      {
        phrase: "Cảm ơn",
        meaning: "Thank you",
        pronunciation: "Cahm uhn",
      },
      {
        phrase: "Bao nhiêu tiền?",
        meaning: "How much?",
        pronunciation: "Bow nyeu tyen",
      },
      {
        phrase: "Rất đẹp",
        meaning: "Very beautiful",
        pronunciation: "Raht dep",
      },
      {
        phrase: "Tôi muốn mua cái này",
        meaning: "I want to buy this",
        pronunciation: "Toy mwon mwa kai nay",
      },
      {
        phrase: "Cho tôi xem thực đơn",
        meaning: "Show me the menu",
        pronunciation: "Cho toy sem thuhk don",
      },
      {
        phrase: "Xin chào",
        meaning: "Hello",
        pronunciation: "Sin chow",
      },
      {
        phrase: "Xin lỗi",
        meaning: "Sorry / Excuse me",
        pronunciation: "Sin loy",
      },
      {
        phrase: "Ngon quá!",
        meaning: "So delicious!",
        pronunciation: "Ngon kwa",
      },
      {
        phrase: "Không cần túi nhựa",
        meaning: "No plastic bag, please",
        pronunciation: "Khom kun twee nyuh-a",
      },
      {
        phrase: "Hẹn gặp lại",
        meaning: "See you again",
        pronunciation: "Hen gap lai",
      },
    ],
    customs: [
      "Lễ hội đèn lồng rằm hàng tháng vào ngày 14 âm lịch",
      "Phong tục thờ cúng tổ tiên tại gia đình và hội quán",
      "Nghề làm đèn lồng truyền thống qua nhiều thế hệ",
      "Tập tục thả đèn hoa đăng trên sông Hoài cầu bình an",
    ],
    localFood: ["Cao lầu", "Mì Quảng", "Bánh mì Hội An", "Cơm gà", "Bánh vạc"],
    bestTime: "Tháng 2-4 (mùa khô, ít mưa)",
    carbonTip:
      "Di chuyển bằng xe đạp trong phố cổ giúp giảm 95% carbon so với xe máy",
  },
  {
    id: "sa-pa",
    name: "Sa Pa",
    region: "Miền Bắc",
    description:
      "Thị trấn sương mù Sa Pa với ruộng bậc thang kỳ vĩ và văn hóa các dân tộc thiểu số H'Mông, Dao đỏ",
    dos: [
      "Mua hàng thủ công trực tiếp từ người phụ nữ H'Mông",
      "Thuê hướng dẫn viên địa phương người dân tộc",
      "Học vài câu tiếng H'Mông để tôn trọng văn hóa",
      "Mặc đủ ấm - nhiệt độ có thể xuống dưới 10°C",
      "Tham gia homestay tại bản làng để trải nghiệm văn hóa",
      "Đi bộ trên các đường mòn được đánh dấu",
    ],
    donts: [
      "Không phân biệt giá với người dân tộc thiểu số",
      "Không vào nhà người dân mà không được mời",
      "Không chụp ảnh trẻ em và phụ nữ mà không xin phép",
      "Không xả rác trên đường trekking",
      "Không hái hoa hoặc cây trên đường đi",
      "Không ép buộc trả giá xuống quá thấp với nghệ nhân",
    ],
    phrases: [
      {
        phrase: "Zaos (tiếng H'Mông)",
        meaning: "Hello/Hi",
        pronunciation: "Zows",
      },
      {
        phrase: "Tsib tos (H'Mông)",
        meaning: "Wait a moment",
        pronunciation: "Tsib tos",
      },
      {
        phrase: "Noj mov (H'Mông)",
        meaning: "Eat rice / Let's eat",
        pronunciation: "Noh moh",
      },
      { phrase: "Nyob zoo", meaning: "Good morning", pronunciation: "Nyoh zoo" },
      {
        phrase: "Ua tsaug",
        meaning: "Thank you",
        pronunciation: "Oo ah tsao",
      },
      {
        phrase: "Koj nyob li cas? (H'Mông)",
        meaning: "How are you?",
        pronunciation: "Kaw nyaw lee cha",
      },
      {
        phrase: "Kuv lub npe hu ua... (H'Mông)",
        meaning: "My name is...",
        pronunciation: "Koo loo beh hoo ua",
      },
      {
        phrase: "Pes tsawg nyiaj? (H'Mông)",
        meaning: "How much money?",
        pronunciation: "Peh chao nyia",
      },
      {
        phrase: "Zoo nkauj heev (H'Mông)",
        meaning: "Very beautiful",
        pronunciation: "Zhong gao heng",
      },
      {
        phrase: "Sib ntsib dua (H'Mông)",
        meaning: "See you again",
        pronunciation: "Shee jee doo-a",
      },
    ],
    customs: [
      "Chợ phiên Sa Pa họp vào cuối tuần - nơi giao thương và gặp gỡ của các dân tộc",
      "Trang phục truyền thống H'Mông với hoa văn thêu tay tinh xảo",
      "Phong tục hát giao duyên trong các lễ hội",
      "Nghề dệt lanh truyền thống của phụ nữ H'Mông",
      "Tết dân tộc H'Mông (Nào Pê Chầu) vào tháng 12",
    ],
    localFood: [
      "Cơm lam",
      "Thắng cố",
      "Cá hồi Sa Pa",
      "Rau cải mèo",
      "Rượu táo mèo",
    ],
    bestTime: "Tháng 3-5 hoặc tháng 9-11 (thời tiết đẹp, ruộng bậc thang xanh/vàng)",
    carbonTip:
      "Đi tàu hỏa Hà Nội - Lào Cai thay vì xe máy giảm 60% carbon. Từ Lào Cai đi xe điện lên Sa Pa",
  },
  {
    id: "phu-quoc",
    name: "Phú Quốc",
    region: "Miền Nam",
    description:
      "Đảo ngọc Phú Quốc với bãi biển trong xanh và hệ sinh thái rừng nhiệt đới phong phú",
    dos: [
      "Dùng kem chống nắng không chứa hóa chất gây hại san hô",
      "Tham gia tour lặn biển có ý thức môi trường",
      "Ăn hải sản tại các nhà hàng chài truyền thống",
      "Khám phá rừng quốc gia Phú Quốc với hướng dẫn viên",
      "Mua nước mắm Phú Quốc - đặc sản hàng đầu Việt Nam",
      "Thuê xe đạp hoặc xe điện để khám phá đảo",
    ],
    donts: [
      "Không sờ hoặc đứng lên san hô khi lặn",
      "Không mua sản phẩm từ động vật hoang dã",
      "Không xả rác xuống biển",
      "Không mang kem chống nắng chứa oxybenzone gây hại san hô",
      "Không câu cá tại các khu vực bảo tồn",
      "Không bắt sao biển hay vỏ ốc",
    ],
    phrases: [
      {
        phrase: "Biển đẹp quá!",
        meaning: "The sea is so beautiful!",
        pronunciation: "Byin dep kwa",
      },
      {
        phrase: "Tôi muốn lặn biển",
        meaning: "I want to go diving",
        pronunciation: "Toy mwon lahn byin",
      },
      {
        phrase: "Hải sản tươi",
        meaning: "Fresh seafood",
        pronunciation: "Hai sahn twi",
      },
      {
        phrase: "Chèo kayak",
        meaning: "Kayaking",
        pronunciation: "Cheo kah-yahk",
      },
      {
        phrase: "Hoàng hôn đẹp",
        meaning: "Beautiful sunset",
        pronunciation: "Hwahng hon dep",
      },
      {
        phrase: "Xin chào",
        meaning: "Hello",
        pronunciation: "Sin chow",
      },
      {
        phrase: "Cảm ơn nhiều",
        meaning: "Thank you very much",
        pronunciation: "Cahm uhn nyew",
      },
      {
        phrase: "Bao nhiêu tiền?",
        meaning: "How much?",
        pronunciation: "Bow nyeu tyen",
      },
      {
        phrase: "Không dùng ống hút nhựa",
        meaning: "No plastic straw, please",
        pronunciation: "Khom zoong ohm hoot nyuh-a",
      },
      {
        phrase: "Nhà vệ sinh ở đâu?",
        meaning: "Where is the restroom?",
        pronunciation: "Nya vay sin uh doh",
      },
    ],
    customs: [
      "Nghề làm nước mắm truyền thống 100 tuổi tại Phú Quốc",
      "Lễ hội cầu ngư - cầu mưa thuận gió hòa của ngư dân",
      "Phong tục thả cá vào mỗi dịp rằm tháng 7",
      "Nghề đánh ngọc trai và chế tác trang sức truyền thống",
    ],
    localFood: [
      "Nước mắm Phú Quốc",
      "Gỏi cá trích",
      "Nhum nướng",
      "Cua Phú Quốc",
      "Bún quậy",
    ],
    bestTime: "Tháng 11 - tháng 4 (mùa khô, biển calmer)",
    carbonTip:
      "Thuê xe đạp điện thay xe máy giúp giảm 100% phát thải tại chỗ. Dùng ống hút giấy và nói không với nhựa một lần",
  },
];

const englishDestinations: CulturalDestination[] = culturalDestinations.map((destination) => ({
  ...destination,
  ...CULTURAL_EN[destination.id],
  phrases: destination.phrases.map((p) => ({ ...p, phrase: p.phrase.replace("tiếng H'Mông", "H'Mông") })),
}));

export function getCulturalDestinations(locale: Locale): CulturalDestination[] {
  return pick(locale, culturalDestinations, englishDestinations);
}

export const getCulturalDestination = (
  id: string
): CulturalDestination | undefined => {
  return culturalDestinations.find((d) => d.id === id);
};
