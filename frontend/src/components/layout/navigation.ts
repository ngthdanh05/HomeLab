// Cấu trúc điều hướng dùng chung cho header desktop và thanh tab đáy trên mobile (docs/UX-UI.md mục 3).
import {
  BookOpenText,
  Bot,
  Compass,
  Earth,
  Rotate3d,
  ShieldCheck,
  ShoppingBasket,
  Target,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";

export interface NavLeaf {
  href: string;
  label: string;
  labelEn: string;
  /** Mô tả ngắn hiển thị trong menu thả xuống. */
  hint?: string;
  hintEn?: string;
  Icon: LucideIcon;
}

export interface NavItem extends NavLeaf {
  /** Nhãn ngắn cho thanh tab đáy (ô rộng ~75px trên màn 375px). */
  shortLabel: string;
  shortLabelEn: string;
  /** Các route con: mục được đánh dấu "đang ở" khi pathname khớp một trong số này. */
  match: readonly string[];
  /** Có `children` ⇒ hiển thị dạng menu thả xuống (Cộng đồng ▾). */
  children?: readonly NavLeaf[];
}

/** Các trang thuộc mục "Khám phá" (trang chủ dẫn tới, header đánh dấu cùng một mục). */
export const EXPLORE_LINKS: readonly NavLeaf[] = [
  {
    href: "/assistant",
    label: "Trợ lý biển",
    labelEn: "Ocean assistant",
    hint: "Lên kế hoạch lặn & du lịch biển",
    hintEn: "Plan dives and island trips",
    Icon: Bot,
  },
  {
    href: "/culture",
    label: "Văn hoá làng chài",
    labelEn: "Fishing village culture",
    hint: "Phong tục & quy tắc bảo tồn",
    hintEn: "Customs & conservation code",
    Icon: BookOpenText,
  },
  {
    href: "/heritage",
    label: "Di sản biển 360°",
    labelEn: "360° ocean heritage",
    hint: "Bảo tàng san hô & làng chài",
    hintEn: "Coral museum & fishing villages",
    Icon: Rotate3d,
  },
];

export const COMMUNITY_LINKS: readonly NavLeaf[] = [
  {
    href: "/quests",
    label: "Nhiệm vụ bảo tồn",
    labelEn: "Conservation Quests",
    hint: "Hoàn thành việc tốt, nhận thưởng",
    hintEn: "Do good, earn rewards",
    Icon: Target,
  },
  {
    href: "/governance",
    label: "Quỹ bảo tồn biển",
    labelEn: "Ocean Conservation Fund",
    hint: "Bỏ phiếu giải ngân cho dự án bảo tồn",
    hintEn: "Vote on conservation grants",
    Icon: Vote,
  },
  {
    href: "/transparency",
    label: "Minh bạch on-chain",
    labelEn: "On-chain transparency",
    hint: "Địa chỉ hợp đồng tự động",
    hintEn: "Smart contract addresses",
    Icon: ShieldCheck,
  },
];

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/",
    label: "Khám phá",
    labelEn: "Explore",
    shortLabel: "Khám phá",
    shortLabelEn: "Explore",
    Icon: Compass,
    match: ["/", "/assistant", "/culture", "/heritage", "/getting-started"],
  },
  {
    href: "/marketplace",
    label: "Chợ làng chài",
    labelEn: "Village Market",
    shortLabel: "Chợ",
    shortLabelEn: "Market",
    Icon: ShoppingBasket,
    match: ["/marketplace"],
  },
  {
    href: "/carbon-tracker",
    label: "Hành trình xanh",
    labelEn: "Green Journey",
    shortLabel: "Hành trình",
    shortLabelEn: "Journey",
    Icon: Earth,
    match: ["/carbon-tracker"],
  },
  {
    href: "/quests",
    label: "Cộng đồng",
    labelEn: "Community",
    shortLabel: "Cộng đồng",
    shortLabelEn: "Community",
    Icon: Users,
    match: COMMUNITY_LINKS.map((l) => l.href),
    children: COMMUNITY_LINKS,
  },
];

/** `/` chỉ khớp chính nó; route khác khớp cả route con (`/marketplace/12`). */
export function matchesPath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavItemActive(pathname: string, item: Pick<NavItem, "match">): boolean {
  return item.match.some((href) => matchesPath(pathname, href));
}
