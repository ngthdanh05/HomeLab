"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  Earth,
  HandCoins,
  HandHeart,
  LineChart,
  MapPin,
  ShoppingBasket,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { ListingCard, ListingCardSkeleton } from "@/components/marketplace/ListingCard";
import { ButtonLink, EmptyState, Skeleton, cn } from "@/components/ui";
import { getChainName } from "@/config/contracts";
import { OCEAN_DESTINATIONS } from "@/data/oceanDestinations";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useImpactStats } from "@/hooks/useImpactStats";
import { useListings } from "@/hooks/useMarketplace";
import { formatTokenAmount } from "@/lib/dashboard";
import { intlLocale } from "@/lib/i18n";
import { useI18n } from "@/providers/LocaleProvider";

const CONTAINER = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
        <h2 id={id} className="mt-2 text-2xl font-bold text-text sm:text-3xl">
          {title}
        </h2>
        {description && <p className="mt-3 text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ───────────────────────────── Cách hoạt động ─────────────────────────────

const STEPS: { Icon: LucideIcon; title: string; titleEn: string; body: string; bodyEn: string }[] = [
  {
    Icon: Compass,
    title: "Khám phá có trách nhiệm",
    titleEn: "Explore responsibly",
    body: "Hỏi trợ lý về mùa lặn, điểm ngắm san hô và quy tắc ứng xử với biển trước khi lên đường.",
    bodyEn: "Ask the assistant about dive seasons, reef spots and ocean etiquette before you go.",
  },
  {
    Icon: HandHeart,
    title: "Ủng hộ làng chài",
    titleEn: "Support fishing villages",
    body: "Mua hải sản khô, đồ thủ công và tour trải nghiệm tận tay ngư dân: 70% về người bán, 20% vào Quỹ bảo tồn.",
    bodyEn: "Buy dried seafood, crafts and tours straight from fishers: 70% goes to the seller, 20% to the conservation fund.",
  },
  {
    Icon: LineChart,
    title: "Xem tác động của bạn",
    titleEn: "See your impact",
    body: "Nhận huy hiệu cho mỗi việc tốt, bù đắp CO₂ chuyến đi và bỏ phiếu chọn dự án bảo tồn được tài trợ.",
    bodyEn: "Earn a badge for every good deed, offset your trip's CO₂ and vote on which conservation projects get funded.",
  },
];

export function HowItWorks() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="how-title" className={cn(CONTAINER, "py-12 sm:py-16")}>
      <SectionHeading
        id="how-title"
        eyebrow={t("Cách hoạt động", "How it works")}
        title={t("Ba bước cho một chuyến biển tử tế", "Three steps to a kinder ocean trip")}
      />
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map(({ Icon, title, titleEn, body, bodyEn }, i) => (
          <li key={titleEn} className="rounded-lg border border-border bg-surface p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-soft text-primary">
                <Icon aria-hidden className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold tabular-nums text-text-muted">
                {t("Bước", "Step")} {i + 1}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-text">{t(title, titleEn)}</h3>
            <p className="mt-2 text-sm text-text-muted">{t(body, bodyEn)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ───────────────────────────── Sản vật nổi bật ─────────────────────────────

const FEATURED_COUNT = 4;

export function FeaturedProducts() {
  const { t } = useI18n();
  const { listings, isLoading, error } = useListings();
  const featured = listings.filter((l) => l.isActive).slice(0, FEATURED_COUNT);

  return (
    <section aria-labelledby="products-title" className="border-y border-border bg-surface py-12 sm:py-16">
      <div className={CONTAINER}>
        <SectionHeading
          id="products-title"
          eyebrow={t("Chợ làng chài", "Village Market")}
          title={t("Sản vật & thủ công biển nổi bật", "Featured sea products & crafts")}
          description={t(
            "Mua trực tiếp từ ngư dân và nghệ nhân ven biển. Tiền được giữ an toàn tới khi bạn xác nhận đã nhận hàng.",
            "Buy directly from coastal fishers and artisans. Your payment is held safely until you confirm delivery.",
          )}
          action={
            <ButtonLink href="/marketplace" variant="secondary" iconRight={ArrowRight}>
              {t("Xem cả chợ", "See the whole market")}
            </ButtonLink>
          }
        />
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label={t("Đang tải sản phẩm", "Loading products")}>
            {Array.from({ length: FEATURED_COUNT }, (_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : featured.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((listing) => (
              <li key={listing.id.toString()} className="grid">
                <ListingCard listing={listing} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={ShoppingBasket}
            title={
              error
                ? t("Chưa tải được sản phẩm", "Could not load products")
                : t("Chợ đang chờ những sản vật đầu tiên", "The market is waiting for its first products")
            }
            description={
              error
                ? t("Kết nối tới mạng đang chậm. Bạn vẫn có thể mở trang Chợ để thử lại.", "The network is slow right now. You can open the market page to try again.")
                : t("Ngư dân và nghệ nhân đã được xác minh có thể đăng bán ngay hôm nay.", "Verified fishers and artisans can list their products today.")
            }
            action={
              <ButtonLink href="/marketplace" iconRight={ArrowRight}>
                {t("Vào Chợ làng chài", "Visit the Village Market")}
              </ButtonLink>
            }
          />
        )}
      </div>
    </section>
  );
}

// ───────────────────────────── Điểm đến ─────────────────────────────

export function Destinations() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="destinations-title" className={cn(CONTAINER, "py-12 sm:py-16")}>
      <SectionHeading
        id="destinations-title"
        eyebrow={t("Điểm đến", "Destinations")}
        title={t("Điểm đến sinh thái biển tiêu biểu", "Highlight marine eco-destinations")}
        description={t(
          "Chọn một nơi để trợ lý gợi ý lịch trình ít phát thải và cách ứng xử đúng với rạn san hô ở đó.",
          "Pick a place and the assistant will suggest a low-carbon plan and how to treat the reef there.",
        )}
        action={
          <ButtonLink href="/culture" variant="secondary" iconRight={ArrowRight}>
            {t("Quy tắc bảo tồn biển", "Marine conservation code")}
          </ButtonLink>
        }
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {OCEAN_DESTINATIONS.map((d) => (
          <li key={d.id}>
            <Link
              href={`/assistant?q=${encodeURIComponent(t(d.question, d.questionEn))}`}
              className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-primary-soft">
                <Image
                  src={d.image}
                  alt={t(d.alt, d.altEn)}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="flex items-center gap-1 text-xs font-medium text-text-muted">
                  <MapPin aria-hidden className="h-4 w-4 shrink-0" />
                  {t(d.region, d.regionEn)}
                </p>
                <h3 className="text-lg font-semibold text-text group-hover:text-primary">{t(d.name, d.nameEn)}</h3>
                <p className="flex-1 text-sm text-text-muted">{t(d.blurb, d.blurbEn)}</p>
                <p className="flex items-center gap-2 text-sm font-medium text-primary">
                  <CalendarDays aria-hidden className="h-4 w-4 shrink-0" />
                  {t(d.season, d.seasonEn)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ───────────────────────────── Con số tác động ─────────────────────────────

function ImpactStat({
  Icon,
  label,
  value,
  hint,
  loading,
}: {
  Icon: LucideIcon;
  label: string;
  value: string | undefined;
  hint: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/10 p-5">
      <Icon aria-hidden className="h-6 w-6 text-white/80" />
      <dt className="mt-3 text-sm text-white/80">{label}</dt>
      <dd className="mt-1 text-3xl font-bold tabular-nums text-white">
        {loading ? <Skeleton className="h-9 w-24 bg-white/20" /> : (value ?? "—")}
      </dd>
      <dd className="mt-1 text-xs text-white/80">{hint}</dd>
    </div>
  );
}

export function ImpactNumbers() {
  const { locale, t } = useI18n();
  const { chainId } = useActiveChain();
  const stats = useImpactStats();
  const number = (n: number) => n.toLocaleString(intlLocale(locale));
  const kg = stats.offsetGrams === undefined ? undefined : Number(stats.offsetGrams) / 1000;

  return (
    <section aria-labelledby="impact-title" className="bg-primary py-12 text-white sm:py-16">
      <div className={CONTAINER}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/80">{t("Con số tác động", "Impact in numbers")}</p>
            <h2 id="impact-title" className="mt-2 text-2xl font-bold sm:text-3xl">
              {t("Mỗi chuyến đi để lại điều tốt cho biển", "Every trip leaves the sea better")}
            </h2>
            <p className="mt-3 text-white/90">
              {t(
                `Số liệu đọc trực tiếp từ hợp đồng tự động trên ${getChainName(chainId)}, ai cũng kiểm tra lại được.`,
                `Figures are read live from the smart contracts on ${getChainName(chainId)}, so anyone can verify them.`,
              )}
            </p>
          </div>
          <Link href="/transparency" className="inline-flex min-h-11 items-center gap-2 font-semibold text-white underline-offset-4 hover:underline">
            {t("Minh bạch on-chain", "On-chain transparency")}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ImpactStat
            Icon={Waves}
            label={t("Dự án bảo tồn biển được tài trợ", "Marine conservation projects funded")}
            value={stats.projectsFunded === undefined ? undefined : number(Number(stats.projectsFunded))}
            hint={t("Lần giải ngân Quỹ đã được cộng đồng bỏ phiếu", "Fund grants approved by community vote")}
            loading={stats.isLoading}
          />
          <ImpactStat
            Icon={HandCoins}
            label={t("Quỹ bảo tồn hiện có", "Conservation fund balance")}
            value={stats.treasuryBalance === undefined ? undefined : `${formatTokenAmount(stats.treasuryBalance, 18, 4, locale)} ETH`}
            hint={t("ETH thử nghiệm, chờ cộng đồng quyết định", "Test ETH awaiting community decisions")}
            loading={stats.isLoading}
          />
          <ImpactStat
            Icon={Earth}
            label={t("CO₂ đã được bù đắp", "CO₂ offset so far")}
            value={kg === undefined ? undefined : `${kg.toLocaleString(intlLocale(locale), { maximumFractionDigits: 1 })} kg`}
            hint={t("Từ phí bù đắp carbon của du khách", "From travellers' carbon offset fees")}
            loading={stats.isLoading}
          />
          <ImpactStat
            Icon={Users}
            label={t("Hộ ngư dân & nghệ nhân", "Fishing households & artisans")}
            value={stats.sellerCount === undefined ? undefined : number(stats.sellerCount)}
            hint={
              stats.listingCount === undefined
                ? t("Người bán khác nhau trên chợ", "Distinct sellers on the market")
                : t(`Người bán khác nhau trong ${number(stats.listingCount)} sản phẩm gần nhất`, `Distinct sellers across the latest ${number(stats.listingCount)} products`)
            }
            loading={stats.sellerCount === undefined}
          />
        </dl>
      </div>
    </section>
  );
}
