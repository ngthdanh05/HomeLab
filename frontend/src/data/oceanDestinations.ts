// Ảnh minh hoạ (Unsplash, đã whitelist trong next.config.mjs) và điểm đến biển tiêu biểu cho trang chủ.
// Ảnh mang tính minh hoạ cho chủ đề, không phải ảnh chụp đúng địa điểm ⇒ alt mô tả nội dung ảnh.

/** Ảnh gốc ở độ rộng vừa đủ; bộ tối ưu của next/image sẽ thu nhỏ tiếp theo từng màn hình. */
const unsplash = (id: string, width: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

export const HERO_IMAGE = {
  src: unsplash("1583212292454-1fe6229603b7", 2000),
  alt: "Rạn san hô nhiều màu và đàn cá nhỏ dưới làn nước xanh có nắng chiếu xuống",
  altEn: "A colourful coral reef and a school of small fish in clear blue water lit by sunbeams",
};

export interface OceanDestination {
  id: string;
  name: string;
  nameEn: string;
  region: string;
  regionEn: string;
  /** Một câu vì sao nơi này đáng đến và cần được giữ gìn. */
  blurb: string;
  blurbEn: string;
  season: string;
  seasonEn: string;
  image: string;
  alt: string;
  altEn: string;
  /** Câu hỏi gửi sang /assistant khi bấm thẻ. */
  question: string;
  questionEn: string;
}

export const OCEAN_DESTINATIONS: readonly OceanDestination[] = [
  {
    id: "cu-lao-cham",
    name: "Cù Lao Chàm",
    nameEn: "Cu Lao Cham",
    region: "Ngoài khơi Hội An",
    regionEn: "Off the coast of Hoi An",
    blurb: "Khu dự trữ sinh quyển thế giới, làng chài trên đảo nói không với túi nilon từ năm 2009.",
    blurbEn: "A World Biosphere Reserve whose island fishing villages have refused plastic bags since 2009.",
    season: "Đẹp nhất: tháng 3 – 8",
    seasonEn: "Best: March – August",
    image: unsplash("1537956965359-7573183d1f57", 1000),
    alt: "Vịnh nhỏ nước xanh ngọc, bãi cát trắng và rừng cây nhìn từ trên cao",
    altEn: "Aerial view of a small turquoise cove, white sand and forest",
    question: "Gợi ý chuyến đi 2 ngày Cù Lao Chàm ít phát thải, có lặn ngắm san hô",
    questionEn: "Suggest a low-carbon 2-day Cu Lao Cham trip with reef snorkelling",
  },
  {
    id: "hon-mun",
    name: "Hòn Mun",
    nameEn: "Hon Mun",
    region: "Vịnh Nha Trang",
    regionEn: "Nha Trang Bay",
    blurb: "Khu bảo tồn biển đầu tiên của Việt Nam, nơi có những rạn san hô đa dạng bậc nhất vịnh.",
    blurbEn: "Vietnam's first marine protected area, home to some of the bay's most diverse reefs.",
    season: "Đẹp nhất: tháng 2 – 9",
    seasonEn: "Best: February – September",
    image: unsplash("1582967788606-a171c1080cb0", 1000),
    alt: "Khối san hô lớn với đàn cá cam nhỏ bơi quanh trong nước xanh",
    altEn: "A large coral head with small orange fish swimming around it in blue water",
    question: "Mùa nào lặn ngắm san hô ở Hòn Mun đẹp nhất?",
    questionEn: "When is the best season to snorkel the coral at Hon Mun?",
  },
  {
    id: "con-dao",
    name: "Côn Đảo",
    nameEn: "Con Dao",
    region: "Quần đảo ngoài khơi Nam Bộ",
    regionEn: "Islands off southern Vietnam",
    blurb: "Vườn quốc gia biển, bãi đẻ quan trọng của rùa biển. Có tour theo kiểm lâm thả rùa con về biển.",
    blurbEn: "A marine national park and key sea turtle nesting ground, with ranger-led hatchling releases.",
    season: "Mùa rùa đẻ: tháng 5 – 10",
    seasonEn: "Turtle nesting: May – October",
    image: unsplash("1518467166778-b88f373ffec7", 1000),
    alt: "Một con rùa biển đang bơi trong làn nước xanh trong",
    altEn: "A sea turtle swimming in clear blue water",
    question: "Đi Côn Đảo xem rùa đẻ trứng thế nào để không làm phiền rùa?",
    questionEn: "How can I watch turtles nesting on Con Dao without disturbing them?",
  },
  {
    id: "phu-quoc",
    name: "Phú Quốc",
    nameEn: "Phu Quoc",
    region: "Vịnh Thái Lan",
    regionEn: "Gulf of Thailand",
    blurb: "Các đảo nhỏ phía nam với rạn san hô nông, làng chài Hàm Ninh và nghề nước mắm truyền thống.",
    blurbEn: "Small southern islands with shallow reefs, the Ham Ninh fishing village and traditional fish sauce.",
    season: "Đẹp nhất: tháng 11 – 4",
    seasonEn: "Best: November – April",
    image: unsplash("1559128010-7c1ad6e1b6a5", 1000),
    alt: "Hòn đảo nhỏ phủ cây xanh giữa biển xanh lam",
    altEn: "A small green island in a blue sea",
    question: "Lịch trình 3 ngày Phú Quốc thân thiện với biển, ghé làng chài Hàm Ninh",
    questionEn: "A sea-friendly 3-day Phu Quoc itinerary including Ham Ninh fishing village",
  },
];
