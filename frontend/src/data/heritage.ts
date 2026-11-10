// Heritage items shown in the 360° archive (pure data, also used by Eco Quests).
import { pick, type Locale } from "../lib/i18n.ts";
import type { HotspotData } from "../lib/three-utils";

export interface HeritageItem {
  id: string;
  title: string;
  location: string;
  category: "Kiến trúc" | "Thiên nhiên" | "Làng nghề";
  description: string;
  panoramaUrl: string;
  hotspots: HotspotData[];
}

export const sampleHeritageItems: HeritageItem[] = [
  {
    id: "chua-cau-hoi-an",
    title: "Chùa Cầu & Phố Cổ Hội An",
    location: "Hội An, Quảng Nam",
    category: "Kiến trúc",
    description:
      "Biểu tượng giao thoa kiến trúc Việt - Nhật - Hoa thế kỷ 17 được bảo tồn nguyên trạng qua công nghệ số hóa 360°.",
    panoramaUrl: "/360/sample-equirectangular-1.svg",
    hotspots: [
      {
        id: "cau-mai",
        position: { phi: 1.57, theta: 0 },
        title: "Mái vòm Cầu Ngói cổ",
        description:
          "Mái lợp âm dương với các họa tiết chạm khắc tinh xảo, chống chịu qua hàng trăm mùa bão lũ miền Trung.",
      },
      {
        id: "tuong-linh-vat",
        position: { phi: 1.8, theta: 1.2 },
        title: "Tượng Thần Khỉ & Thần Chó",
        description:
          "Hai đầu cầu đặt tượng khỉ và chó bằng gỗ mít, biểu tượng trấn yểm thủy quái Cù theo truyền thuyết Á Đông.",
      },
      {
        id: "song-hoai",
        position: { phi: 1.4, theta: 3.14 },
        title: "Bến Thuyền Sông Hoài",
        description:
          "Dòng sông chứng nhân thương cảng phồn thịnh một thời, nơi diễn ra lễ hội thả đèn hoa đăng tuần hoàn không rác thải.",
      },
    ],
  },
  {
    id: "ruong-bac-thang-sapa",
    title: "Ruộng Bậc Thang Mường Hoa",
    location: "Sa Pa, Lào Cai",
    category: "Thiên nhiên",
    description:
      "Tuyệt tác nông nghiệp canh tác bền vững trên triền núi dốc của đồng bào dân tộc H'Mông và Giáy.",
    panoramaUrl: "/360/sample-equirectangular-2.svg",
    hotspots: [
      {
        id: "he-thong-thuy-loi",
        position: { phi: 1.6, theta: 0.8 },
        title: "Dẫn nước bằng ống nứa tự nhiên",
        description:
          "Mô hình thủy lợi tự chảy đưa nước từ khe suối rừng già về từng thửa ruộng bậc thang không tiêu hao năng lượng.",
      },
      {
        id: "cay-lua-nuoc",
        position: { phi: 2.0, theta: 2.1 },
        title: "Canh tác lúa nương bản địa",
        description:
          "Giống lúa nếp hương lưu truyền qua nhiều đời, hoàn toàn không sử dụng phân bón hóa học độc hại.",
      },
    ],
  },
  {
    id: "lang-gom-thanh-ha",
    title: "Làng Gốm Truyền Thống Thanh Hà",
    location: "Hội An, Quảng Nam",
    category: "Làng nghề",
    description:
      "Làng nghề hơn 500 năm tuổi ven sông Thu Bồn, giữ trọn kỹ thuật làm gốm bằng đất sét tự nhiên thủ công bằng chân xoay.",
    panoramaUrl: "/360/sample-equirectangular-1.svg",
    hotspots: [
      {
        id: "ban-xoay-gom",
        position: { phi: 1.57, theta: 1.57 },
        title: "Bàn xoay thủ công truyền thống",
        description:
          "Hai người phối hợp nhịp nhàng: một người chuốt đất, một người dùng chân đạp bàn xoay.",
      },
      {
        id: "lo-nung-cui",
        position: { phi: 1.3, theta: -1.0 },
        title: "Lò nung gốm đốt củi cành",
        description:
          "Sử dụng cành cây khô tỉa từ vườn tái sinh, không dùng than đá nhằm giảm phát thải khí nhà kính.",
      },
    ],
  },
];

const HERITAGE_EN: Record<
  string,
  { title: string; location: string; description: string; hotspots: Record<string, { title: string; description: string }> }
> = {
  "chua-cau-hoi-an": {
    title: "Japanese Covered Bridge & Hoi An Ancient Town",
    location: "Hoi An, Quang Nam",
    description:
      "A 17th-century symbol of blended Vietnamese, Japanese and Chinese architecture, preserved as it stands through 360° digitization.",
    hotspots: {
      "cau-mai": {
        title: "The old tiled bridge roof",
        description:
          "A yin-yang tiled roof with finely carved motifs that has withstood hundreds of storm and flood seasons in central Vietnam.",
      },
      "tuong-linh-vat": {
        title: "Monkey and Dog guardian statues",
        description:
          "Jackfruit-wood monkeys and dogs stand at the two ends of the bridge, said in East Asian legend to subdue the water monster Cu.",
      },
      "song-hoai": {
        title: "Hoai River boat landing",
        description:
          "The river witnessed a once-thriving trading port and now hosts a zero-waste, circular floating-lantern festival.",
      },
    },
  },
  "ruong-bac-thang-sapa": {
    title: "Muong Hoa Terraced Rice Fields",
    location: "Sa Pa, Lao Cai",
    description:
      "A masterpiece of sustainable farming on steep mountainsides, created by the H'Mong and Giay peoples.",
    hotspots: {
      "he-thong-thuy-loi": {
        title: "Water carried by natural bamboo pipes",
        description:
          "A gravity-fed irrigation system brings water from old-forest streams to every terrace without using any energy.",
      },
      "cay-lua-nuoc": {
        title: "Indigenous upland rice farming",
        description:
          "A fragrant sticky rice variety handed down over generations, grown entirely without harmful chemical fertilizers.",
      },
    },
  },
  "lang-gom-thanh-ha": {
    title: "Thanh Ha Traditional Pottery Village",
    location: "Hoi An, Quang Nam",
    description:
      "A craft village over 500 years old on the Thu Bon River, keeping alive the technique of shaping natural clay on a foot-turned wheel.",
    hotspots: {
      "ban-xoay-gom": {
        title: "Traditional hand-built potter's wheel",
        description: "Two people work in rhythm: one shapes the clay while the other turns the wheel with their feet.",
      },
      "lo-nung-cui": {
        title: "Wood-fired pottery kiln",
        description:
          "Fired with dry branches pruned from regenerating gardens instead of coal, to reduce greenhouse gas emissions.",
      },
    },
  },
};

// Built once: the 360° scene is rebuilt whenever the hotspots array changes identity.
const englishHeritageItems: HeritageItem[] = sampleHeritageItems.map((item) => {
  const en = HERITAGE_EN[item.id];
  return {
    ...item,
    title: en.title,
    location: en.location,
    description: en.description,
    hotspots: item.hotspots.map((hotspot) => ({ ...hotspot, ...en.hotspots[hotspot.id] })),
  };
});

export function getHeritageItems(locale: Locale): HeritageItem[] {
  return pick(locale, sampleHeritageItems, englishHeritageItems);
}

/** IDs of every heritage item (the "Nhà thám hiểm di sản" quest needs all of them). */
export const HERITAGE_IDS: readonly string[] = sampleHeritageItems.map((item) => item.id);
