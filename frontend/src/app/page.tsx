import { HomeHero } from "@/components/home/HomeHero";
import { Destinations, FeaturedProducts, HowItWorks, ImpactNumbers } from "@/components/home/HomeSections";

/**
 * Trang chủ dạng landing page (docs/UX-UI.md mục 5.1): hero có ảnh + ô hỏi nhanh AI,
 * cách hoạt động, sản vật nổi bật, điểm đến, con số tác động. Công cụ nằm ở route riêng
 * (/assistant, /culture, /heritage) để chia sẻ được link.
 */
export default function Home() {
  return (
    <main id="main" className="flex-1">
      <HomeHero />
      <HowItWorks />
      <FeaturedProducts />
      <Destinations />
      <ImpactNumbers />
    </main>
  );
}
