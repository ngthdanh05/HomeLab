"use client";

import React, { useDeferredValue, useMemo, useState } from "react";
import { Search, SearchX, ShoppingBasket, Store } from "lucide-react";
import { CreateListingModal } from "@/components/marketplace/CreateListingModal";
import { ListingCard, ListingCardSkeleton } from "@/components/marketplace/ListingCard";
import { SplitBreakdown } from "@/components/marketplace/SplitBreakdown";
import {
  Alert,
  APP_ICONS,
  Button,
  EmptyState,
  FilterChips,
  Input,
  LoadingRegion,
  Modal,
  PageHeader,
  Select,
  Switch,
  type FilterChipItem,
} from "@/components/ui";
import { useInactiveListingStates, useListings, useListingsMetadata } from "@/hooks/useMarketplace";
import { LISTINGS_PAGE_SIZE, PRODUCT_TYPES, type Listing } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

type Category = "all" | `${(typeof PRODUCT_TYPES)[number]["value"]}`;
type Sort = "newest" | "price-asc" | "price-desc";

const SORTERS: Record<Sort, (a: Listing, b: Listing) => number> = {
  newest: (a, b) => (a.id > b.id ? -1 : 1),
  "price-asc": (a, b) => (a.price === b.price ? 0 : a.price < b.price ? -1 : 1),
  "price-desc": (a, b) => (a.price === b.price ? 0 : a.price > b.price ? -1 : 1),
};

/** Bỏ dấu tiếng Việt để tìm "nhon ly" ra "Nhơn Lý". */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

export default function MarketplacePage() {
  const { t } = useI18n();
  const [limit, setLimit] = useState(LISTINGS_PAGE_SIZE);
  const { listings, hasMore, isLoading, error, refetch } = useListings(limit);
  const metadata = useListingsMetadata(listings);
  const inactiveStates = useInactiveListingStates(listings);

  const [category, setCategory] = useState<Category>("all");
  const [showSold, setShowSold] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [sort, setSort] = useState<Sort>("newest");
  const [createOpen, setCreateOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);

  const visible = useMemo(() => {
    const needle = fold(deferredQuery.trim());
    return listings
      .filter((l) => (showSold ? l.isActive || inactiveStates.get(l.id.toString()) === "sold" : l.isActive))
      .filter((l) => category === "all" || String(l.pType) === category)
      .filter((l) => {
        if (!needle) return true;
        const m = metadata.get(l.id.toString());
        return fold([m?.name, m?.artisan, m?.village, m?.description].filter(Boolean).join(" ")).includes(needle);
      })
      .sort(SORTERS[sort]);
  }, [listings, metadata, inactiveStates, showSold, category, deferredQuery, sort]);

  const activeCount = (type?: number) => listings.filter((l) => l.isActive && (type === undefined || l.pType === type)).length;
  const categories: FilterChipItem<Category>[] = [
    { id: "all", label: t("Tất cả", "All"), count: activeCount() },
    ...PRODUCT_TYPES.map((type) => ({
      id: `${type.value}` as Category,
      label: t<string>(type.label, type.labelEn),
      icon: APP_ICONS[type.icon],
      count: activeCount(type.value),
    })),
  ];
  const filtered = category !== "all" || showSold || query.trim() !== "";
  const resetFilters = () => {
    setCategory("all");
    setShowSold(false);
    setQuery("");
  };

  const sellButton = (
    <Button variant="secondary" icon={Store} onClick={() => setCreateOpen(true)}>
      {t("Bạn là nghệ nhân? Đăng bán", "Are you an artisan? List a product")}
    </Button>
  );

  return (
    <>
      <PageHeader
        eyebrow={t("Chợ làng chài", "Village Market")}
        icon={ShoppingBasket}
        title={t("Chợ làng chài & Thủ công biển", "Fishing Village Market & Sea Crafts")}
        description={
          <>
            {t(
              "Mua trực tiếp từ ngư dân và nghệ nhân ven biển. Tiền được giữ an toàn tới khi bạn nhận hàng.",
              "Buy directly from coastal fishers and artisans. Your money is held safely until you receive your order.",
            )}{" "}
            <button type="button" onClick={() => setSplitOpen(true)} className="inline-flex min-h-11 items-center font-semibold text-primary underline hover:text-primary-hover">
              {t("Tiền của bạn đi về đâu?", "Where does your money go?")}
            </button>
          </>
        }
        actions={sellButton}
      />

      <section aria-label={t("Lọc và tìm sản phẩm", "Filter and search products")} className="space-y-4">
        <FilterChips items={categories} value={category} onChange={setCategory} label={t("Danh mục", "Category")} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:max-w-sm md:flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Tìm sản phẩm, nghệ nhân, làng chài…", "Search products, artisans, villages…")}
              aria-label={t("Tìm kiếm sản phẩm", "Search products")}
              className="pl-10"
            />
          </div>
          <div className="w-full md:w-56">
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t("Sắp xếp", "Sort")}>
              <option value="newest">{t("Mới nhất", "Newest")}</option>
              <option value="price-asc">{t("Giá thấp đến cao", "Price: low to high")}</option>
              <option value="price-desc">{t("Giá cao đến thấp", "Price: high to low")}</option>
            </Select>
          </div>
          <Switch checked={showSold} onChange={setShowSold} label={t("Hiện mục đã bán", "Show sold items")} className="md:ml-auto" />
        </div>
      </section>

      <section aria-label={t("Danh sách sản phẩm", "Products")}>
        {error ? (
          <Alert
            tone="danger"
            title={t("Không đọc được dữ liệu Chợ làng chài từ mạng.", "Could not read Village Market data from the network.")}
            action={
              <Button variant="secondary" onClick={() => void refetch()}>
                {t("Thử lại", "Try again")}
              </Button>
            }
          />
        ) : isLoading ? (
          <LoadingRegion label={t("Đang tải sản phẩm", "Loading products")} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </LoadingRegion>
        ) : visible.length === 0 ? (
          listings.length === 0 || (!filtered && activeCount() === 0) ? (
            <EmptyState
              icon={ShoppingBasket}
              title={t("Chợ đang chờ mẻ hàng đầu tiên", "The market is waiting for its first catch")}
              description={t(
                "Chưa có sản phẩm nào đang bán. Ngư dân và nghệ nhân đã được xác thực có thể đăng sản phẩm hoặc tour đầu tiên.",
                "Nothing is for sale yet. Verified fishers and artisans can list the first product or tour.",
              )}
              action={sellButton}
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title={t("Không có sản phẩm phù hợp", "No matching products")}
              description={t("Thử danh mục khác hoặc bỏ bớt từ khoá tìm kiếm.", "Try another category or fewer search words.")}
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  {t("Xoá bộ lọc", "Clear filters")}
                </Button>
              }
            />
          )
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((listing) => (
              <li key={listing.id.toString()} className="flex">
                <ListingCard listing={listing} inactiveState={inactiveStates.get(listing.id.toString())} />
              </li>
            ))}
          </ul>
        )}

        {hasMore && !error && (
          <div className="mt-8 text-center">
            <Button variant="secondary" onClick={() => setLimit((n) => n + LISTINGS_PAGE_SIZE)}>
              {t("Xem thêm sản phẩm", "Show more products")}
            </Button>
          </div>
        )}
      </section>

      <Modal open={splitOpen} onClose={() => setSplitOpen(false)} title={t("Tiền của bạn đi về đâu?", "Where does your money go?")}>
        <p className="mb-4 text-sm text-text-muted">
          {t(
            "Tiền được giữ an toàn tới khi bạn xác nhận đã nhận hàng hoặc hoàn thành tour. Sau đó hợp đồng tự động chia:",
            "Your money is held safely until you confirm delivery or the tour. The smart contract then splits it automatically:",
          )}
        </p>
        <SplitBreakdown />
      </Modal>

      <CreateListingModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
