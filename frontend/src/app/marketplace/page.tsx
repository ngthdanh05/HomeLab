"use client";

import React, { useMemo, useState } from "react";
import { CreateListingModal } from "@/components/marketplace/CreateListingModal";
import { ListingCard, ListingCardSkeleton } from "@/components/marketplace/ListingCard";
import { SplitBreakdown } from "@/components/marketplace/SplitBreakdown";
import { getChainName } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useListings } from "@/hooks/useMarketplace";
import { LISTINGS_PAGE_SIZE, PRODUCT_TYPES } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

type Filter = "all" | "active" | (typeof PRODUCT_TYPES)[number]["value"];

export default function MarketplacePage() {
  const { t } = useI18n();
  const { chainId } = useActiveChain();
  const [limit, setLimit] = useState(LISTINGS_PAGE_SIZE);
  const { listings, hasMore, isLoading, error, refetch } = useListings(limit);
  const [filter, setFilter] = useState<Filter>("active");
  const [createOpen, setCreateOpen] = useState(false);

  const visible = useMemo(
    () =>
      listings.filter((l) =>
        filter === "all" ? true : filter === "active" ? l.isActive : l.isActive && l.pType === filter,
      ),
    [listings, filter],
  );

  const filters: { value: Filter; label: string }[] = [
    { value: "active", label: t("Đang bán", "For sale") },
    ...PRODUCT_TYPES.map((type) => ({ value: type.value, label: `${type.icon} ${t<string>(type.label, type.labelEn)}` })),
    { value: "all", label: t("Tất cả (kể cả đã bán)", "All (including sold)") },
  ];

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-emerald-900/50 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex rounded-full border border-emerald-800/80 bg-emerald-950/80 px-3 py-1 text-xs font-semibold text-emerald-400">
              ⛓️ D2C on-chain · {getChainName(chainId)}
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {t("Mua trực tiếp từ nghệ nhân địa phương", "Buy directly from local artisans")}
            </h1>
            <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
              {t(
                "Tiền được giữ an toàn trong escrow tới khi bạn xác nhận đã nhận hàng, rồi Smart Contract tự chia cho nghệ nhân, Quỹ Cộng đồng bảo tồn và nền tảng. Người mua nhận NFT ImpactBadge làm bằng chứng đóng góp.",
                "Your money is held safely in escrow until you confirm delivery. The smart contract then splits it between the artisan, the Community Conservation Treasury and the platform. Buyers receive an ImpactBadge NFT as proof of their contribution.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="shrink-0 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-950/50 transition-colors hover:bg-emerald-600"
          >
            {t("+ Đăng bán sản phẩm", "+ List a product")}
          </button>
        </div>
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="mb-3 text-xs font-medium text-slate-400">{t("Cách chia doanh thu mỗi giao dịch", "How each sale is split")}</p>
          <SplitBreakdown />
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t("Lọc sản phẩm", "Filter products")}>
        {filters.map((f) => (
          <button
            key={String(f.value)}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-emerald-700 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-700/50 bg-red-900/20 p-6 text-center">
          <p className="text-sm text-red-300">
            ⚠️ {t("Không đọc được dữ liệu Marketplace từ blockchain.", "Could not read Marketplace data from the blockchain.")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            {t("Thử lại", "Try again")}
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center">
          <p className="text-4xl">🧺</p>
          <p className="mt-3 font-medium text-slate-300">{t("Chưa có sản phẩm nào ở mục này", "No products in this category yet")}</p>
          <p className="mt-1 text-sm text-slate-400">{t("Hãy là nghệ nhân đầu tiên đăng bán!", "Be the first artisan to list a product!")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((listing) => (
            <ListingCard key={listing.id.toString()} listing={listing} />
          ))}
        </div>
      )}

      {hasMore && !error && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setLimit((n) => n + LISTINGS_PAGE_SIZE)}
            className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            {t("Xem thêm sản phẩm", "Show more products")}
          </button>
        </div>
      )}

      <CreateListingModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
