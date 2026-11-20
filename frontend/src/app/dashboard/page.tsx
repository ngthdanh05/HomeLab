"use client";

import React, { Suspense, useCallback, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { LayoutDashboard, Package } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { BadgeGallery } from "@/components/dashboard/BadgeGallery";
import { DashboardPreview, ImpactSummary, TodoList } from "@/components/dashboard/DashboardOverview";
import { MyOrders } from "@/components/dashboard/MyOrders";
import { Address, LoadingRegion, Skeleton, tabPanelProps, Tabs } from "@/components/ui";
import { useI18n } from "@/providers/LocaleProvider";

const noopSubscribe = () => () => {};
type Tab = "overview" | "orders";
const TABS_ID = "dashboard";

function DashboardSkeleton() {
  const { t } = useI18n();
  return (
    <LoadingRegion label={t("Đang tải", "Loading")} className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </LoadingRegion>
  );
}

function DashboardContent() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { address, isConnected, isReconnecting } = useAccount();
  // Trạng thái ví chỉ có ở trình duyệt: server và lần render đầu hiện khung chờ để hydrate khớp.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const tab: Tab = searchParams.get("tab") === "orders" ? "orders" : "overview";
  const setTab = useCallback(
    (next: Tab) => router.replace(next === "orders" ? `${pathname}?tab=orders` : pathname, { scroll: false }),
    [router, pathname],
  );

  // Chỉ lần tự kết nối lại khi tải trang mới hiện khung chờ; khi người dùng đang xác nhận trong ví thì giữ bản xem trước.
  if (!mounted || (isReconnecting && !address)) return <DashboardSkeleton />;
  if (!isConnected || !address) return <DashboardPreview />;

  return (
    <>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-bold leading-tight text-text sm:text-4xl">{t("Của tôi", "My Page")}</h1>
        <p className="flex items-center gap-2 text-sm text-text-muted">
          {t("Ví đang kết nối", "Connected wallet")} <Address value={address} chars={6} />
        </p>
      </header>

      <Tabs
        idPrefix={TABS_ID}
        label={t("Mục trong trang Của tôi", "My Page sections")}
        value={tab}
        onChange={setTab}
        items={[
          { id: "overview", label: t("Tổng quan", "Overview"), icon: LayoutDashboard },
          { id: "orders", label: t("Đơn hàng & Lịch đặt", "Orders & Bookings"), icon: Package },
        ]}
      />

      {tab === "overview" ? (
        <div {...tabPanelProps(TABS_ID, "overview")} className="space-y-12 focus:outline-none">
          <TodoList user={address} onOpenOrders={() => setTab("orders")} />
          <ImpactSummary user={address} />
          <BadgeGallery owner={address} />
          <ActivityFeed user={address} />
        </div>
      ) : (
        <div {...tabPanelProps(TABS_ID, "orders")} className="focus:outline-none">
          <MyOrders user={address} />
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  // useSearchParams cần Suspense để trang vẫn được prerender tĩnh.
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
