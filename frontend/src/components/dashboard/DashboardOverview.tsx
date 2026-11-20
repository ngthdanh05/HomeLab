"use client";

import React from "react";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { ArrowRight, CircleCheck, Earth, Gift, HandCoins, Package, Wallet, Zap, type LucideIcon } from "lucide-react";
import { Amount, AppIcon, Button, ButtonLink, Card, Skeleton, Stat, StatGroup } from "@/components/ui";
import { localizeQuest } from "@/data/quests";
import { useCarbonOffset } from "@/hooks/useCarbonOffset";
import { useChainNow, useVotingPower } from "@/hooks/useGovernance";
import { useMyImpact, useMyOrders } from "@/hooks/useOrders";
import { useQuestProgress } from "@/hooks/useQuestProgress";
import { BADGE_TYPES } from "@/lib/dashboard";
import { EXPERIENCE_TYPE, getOrderActions, orderNeedsAction } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";
import { useWalletModal } from "@/providers/WalletModal";
import { TokenBalance } from "./TokenBalance";

function TodoRow({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: React.ReactNode; hint?: React.ReactNode; action: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-text">{title}</p>
        {hint && <p className="mt-1 text-sm text-text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{action}</div>
    </li>
  );
}

/** Việc cần làm: đơn / tour chờ xác nhận, thưởng nhiệm vụ chờ nhận, quyền bỏ phiếu chưa kích hoạt. */
export function TodoList({ user, onOpenOrders }: { user: Address; onOpenOrders: () => void }) {
  const { locale, t } = useI18n();
  const now = useChainNow(30_000);
  const { orders, escrowPeriod, arbiter, isLoading } = useMyOrders(user);
  const { quests } = useQuestProgress(user);
  const { state: votingState } = useVotingPower(user);

  const pending = orders.filter((o) =>
    orderNeedsAction(getOrderActions({ order: o.order, seller: o.listing.seller, arbiter, user, now, escrowPeriod })),
  );
  const tours = pending.filter((o) => o.listing.pType === EXPERIENCE_TYPE).length;
  const goods = pending.length - tours;
  const claimable = quests.filter((q) => q.progress.state === "ready");

  const rows: React.ReactNode[] = [];
  if (goods > 0) {
    rows.push(
      <TodoRow
        key="orders"
        icon={Package}
        title={t(`${goods} đơn hàng chờ bạn xác nhận`, `${goods} order${goods === 1 ? "" : "s"} waiting for you`)}
        hint={t("Xác nhận khi đã nhận hàng để giải ngân cho nghệ nhân và nhận ECO.", "Confirm once it arrives to pay the artisan and earn ECO.")}
        action={
          <Button variant="secondary" iconRight={ArrowRight} onClick={onOpenOrders}>
            {t("Xem đơn hàng", "View orders")}
          </Button>
        }
      />,
    );
  }
  if (tours > 0) {
    rows.push(
      <TodoRow
        key="tours"
        icon={CircleCheck}
        title={t(`${tours} tour chờ xác nhận hoàn thành`, `${tours} tour${tours === 1 ? "" : "s"} to confirm`)}
        hint={t("Sau chuyến đi, xác nhận để giải ngân cho người tổ chức.", "After the trip, confirm to pay the organiser.")}
        action={
          <Button variant="secondary" iconRight={ArrowRight} onClick={onOpenOrders}>
            {t("Xem lịch đặt", "View bookings")}
          </Button>
        }
      />,
    );
  }
  if (claimable.length > 0) {
    rows.push(
      <TodoRow
        key="quests"
        icon={Gift}
        title={t(`${claimable.length} phần thưởng nhiệm vụ chờ nhận`, `${claimable.length} quest reward${claimable.length === 1 ? "" : "s"} to claim`)}
        hint={claimable.map((q) => localizeQuest(q, locale).title).join(" · ")}
        action={
          <ButtonLink href="/quests" variant="secondary" iconRight={ArrowRight}>
            {t("Nhận thưởng", "Claim")}
          </ButtonLink>
        }
      />,
    );
  }
  if (votingState === "not-delegated") {
    rows.push(
      <TodoRow
        key="vote"
        icon={Zap}
        title={t("Kích hoạt quyền bỏ phiếu cho ECO của bạn", "Activate voting power for your ECO")}
        hint={t("Cần làm trước khi đề xuất mới được tạo để bạn được bỏ phiếu.", "Do it before new proposals are created so you can vote on them.")}
        action={
          <ButtonLink href="/governance" variant="secondary" iconRight={ArrowRight}>
            {t("Tới Quỹ bảo tồn biển", "Go to the Fund")}
          </ButtonLink>
        }
      />,
    );
  }

  return (
    <section aria-labelledby="todo-title" className="space-y-2">
      <h2 id="todo-title" className="text-2xl font-semibold text-text">
        {t("Việc cần làm", "To do")}
      </h2>
      <Card padding="none" className="px-6">
        {isLoading ? (
          <div role="status" aria-busy="true" className="py-4">
            <Skeleton className="h-12 w-full" />
            <span className="sr-only">{t("Đang tải việc cần làm", "Loading your to-dos")}</span>
          </div>
        ) : rows.length > 0 ? (
          <ul className="divide-y divide-border">{rows}</ul>
        ) : (
          <p className="flex items-center gap-3 py-6 text-sm text-text-muted">
            <CircleCheck aria-hidden className="h-5 w-5 shrink-0 text-primary" />
            {t("Không có việc nào đang chờ bạn. Biển cảm ơn bạn!", "Nothing is waiting for you. The ocean thanks you!")}
          </p>
        )}
      </Card>
    </section>
  );
}

/** Tác động bảo tồn: ECO, kg CO₂ đã bù đắp, ETH đã góp vào Quỹ bảo tồn biển (đọc on-chain). */
export function ImpactSummary({ user }: { user: Address }) {
  const { t } = useI18n();
  const carbon = useCarbonOffset(user);
  const impact = useMyImpact(user);
  const contributed = impact.data ? impact.data.offsetPaidWei + impact.data.purchaseTreasuryWei : undefined;

  return (
    <section aria-labelledby="impact-title" className="space-y-4">
      <h2 id="impact-title" className="text-2xl font-semibold text-text">
        {t("Tác động bảo tồn của tôi", "My conservation impact")}
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <TokenBalance owner={user} />
        <StatGroup className="sm:grid-cols-2 lg:col-span-2 lg:grid-cols-2">
          <Stat
            icon={Earth}
            tone="primary"
            label={t("CO₂ đã bù đắp", "CO₂ offset")}
            value={carbon.offsetGrams !== undefined ? <Amount value={Number(carbon.offsetGrams) / 1000} symbol="kg" maxFractionDigits={1} /> : "—"}
            hint={carbon.offsetCount !== undefined ? t(`${carbon.offsetCount} lần bù đắp`, `${carbon.offsetCount} offset${carbon.offsetCount === 1n ? "" : "s"}`) : undefined}
          />
          <Stat
            icon={HandCoins}
            tone="primary"
            label={t("Đóng góp Quỹ bảo tồn biển", "Given to the Ocean Fund")}
            value={contributed !== undefined ? <Amount value={contributed} symbol="ETH" maxFractionDigits={6} /> : "—"}
            hint={t("20% mỗi đơn đã hoàn tất + phí bù carbon", "20% of completed orders + offset fees")}
          />
        </StatGroup>
      </div>
    </section>
  );
}

/** Chưa kết nối ví: xem trước mờ các Huy hiệu Người giữ biển, nút kết nối, link hướng dẫn. */
export function DashboardPreview() {
  const { t } = useI18n();
  const { isConnecting } = useAccount();
  const { open, prefetch } = useWalletModal();

  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-bold leading-tight text-text sm:text-4xl">{t("Của tôi", "My Page")}</h1>
        <p className="text-base text-text-muted">
          {t(
            "Kết nối ví để xem đơn hàng, lịch đặt tour, số kg CO₂ đã bù đắp và bộ sưu tập Huy hiệu Người giữ biển của bạn.",
            "Connect your wallet to see your orders, tour bookings, CO₂ offset and your Ocean Keeper badge collection.",
          )}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" icon={Wallet} loading={isConnecting} onClick={open} onPointerEnter={prefetch} onFocus={prefetch}>
            {isConnecting ? t("Đang chờ xác nhận trong ví…", "Waiting for wallet confirmation…") : t("Kết nối ví", "Connect wallet")}
          </Button>
          <ButtonLink href="/getting-started" variant="ghost">
            {t("Mới dùng ví lần đầu?", "New to crypto wallets?")}
          </ButtonLink>
        </div>
      </div>

      <section aria-labelledby="preview-title" className="space-y-4">
        <h2 id="preview-title" className="text-xl font-semibold text-text">
          {t("Huy hiệu Người giữ biển bạn có thể nhận", "Ocean Keeper badges you can earn")}
        </h2>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {BADGE_TYPES.map((badge) => (
            <li key={badge.key} className="relative overflow-hidden rounded-lg border border-border bg-surface p-6 text-center">
              <div aria-hidden className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-strong opacity-60 blur-sm">
                <AppIcon name={badge.icon} className="h-8 w-8" />
              </div>
              <p className="mt-3 font-semibold text-text">{t<string>(badge.label, badge.labelEn)}</p>
              <p className="mt-1 text-sm text-text-muted">{t<string>(badge.description, badge.descriptionEn)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
