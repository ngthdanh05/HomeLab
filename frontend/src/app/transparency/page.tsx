"use client";

import React from "react";
import { useAccount } from "wagmi";
import { ShieldCheck } from "lucide-react";
import { Address, Card, PageHeader } from "@/components/ui";
import {
  getCarbonOffsetAddress,
  getChainName,
  getQuestRewardsAddress,
  type ContractName,
} from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useI18n } from "@/providers/LocaleProvider";

/** Vai trò của từng hợp đồng, viết cho người không rành blockchain. */
type ContractKey = ContractName | "carbonOffset" | "questRewards";

const CONTRACT_INFO: Record<ContractKey, { name: string; vi: string; en: string }> = {
  ecoToken: { name: "EcoToken (ECO)", vi: "Điểm thưởng khi mua hàng, dùng để bỏ phiếu cho Quỹ bảo tồn biển.", en: "Reward points from purchases, used to vote on the Ocean Conservation Fund." },
  impactBadge: { name: "ImpactBadge", vi: "Huy hiệu ghi nhận hành động tốt: mua từ làng chài, bù đắp carbon…", en: "Badges recording good actions: buying from villages, offsetting carbon…" },
  communityTreasury: { name: "CommunityTreasury", vi: "Quỹ bảo tồn biển giữ 20% mỗi đơn hàng và toàn bộ phí bù đắp carbon.", en: "The Ocean Conservation Fund holds 20% of each order and every carbon offset fee." },
  governance: { name: "Governance", vi: "Nơi người giữ ECO đề xuất và bỏ phiếu giải ngân Quỹ cho dự án bảo tồn.", en: "Where ECO holders propose and vote on grants from the Fund." },
  paymentSplitter: { name: "PaymentSplitter", vi: "Tự động chia tiền: 70% người bán · 20% Quỹ · 10% nền tảng.", en: "Splits each payment: 70% seller · 20% Fund · 10% platform." },
  marketplace: { name: "Marketplace", vi: "Đăng bán, mua và giữ tiền đơn hàng tới khi người mua xác nhận.", en: "Listings, purchases and escrow until the buyer confirms delivery." },
  carbonOffset: { name: "CarbonOffset", vi: "Nhận phí bù đắp CO₂ của chuyến đi và chuyển vào Quỹ.", en: "Takes trip CO₂ offset fees and sends them to the Fund." },
  questRewards: { name: "QuestRewards", vi: "Kiểm tra nhiệm vụ xanh đã hoàn thành và trao thưởng.", en: "Checks completed green quests and pays out rewards." },
};

export default function TransparencyPage() {
  const { t } = useI18n();
  const { isConnected, address } = useAccount();
  const { chainId, addresses } = useActiveChain();
  // Đủ 8 hợp đồng: 6 hợp đồng lõi + CarbonOffset và QuestRewards (deploy riêng, có thể chưa có trên một mạng).
  const contracts: [ContractKey, string][] = [
    ...(Object.entries(addresses) as [ContractName, string][]),
    ["carbonOffset", getCarbonOffsetAddress(chainId) ?? ""],
    ["questRewards", getQuestRewardsAddress(chainId) ?? ""],
  ];

  return (
    <>
      <PageHeader
        eyebrow={t("Cộng đồng", "Community")}
        icon={ShieldCheck}
        title={t("Minh bạch on-chain", "On-chain transparency")}
        description={t(
          "Mọi giao dịch mua bán, bù đắp carbon và giải ngân Quỹ bảo tồn biển được các hợp đồng tự động dưới đây xử lý và ghi công khai. Ai cũng có thể kiểm tra lại.",
          "Every purchase, carbon offset and Ocean Conservation Fund disbursement is processed by the smart contracts below and recorded publicly on-chain. Anyone can verify it.",
        )}
      />

      <section aria-labelledby="contracts-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="contracts-heading" className="text-xl font-bold text-text">
            {t("Hợp đồng tự động", "Smart contracts")}
          </h2>
          <span className="text-sm text-text-muted">
            {t("Mạng", "Network")}: {getChainName(chainId)}
          </span>
        </div>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contracts.map(([key, addr]) => {
            const info = CONTRACT_INFO[key];
            return (
              <Card as="li" size="sm" padding="sm" key={key} className="flex flex-col gap-2">
                <h3 className="font-semibold text-text">{info.name}</h3>
                <p className="flex-1 text-sm text-text-muted">{t(info.vi, info.en)}</p>
                {addr ? (
                  <Address value={addr} />
                ) : (
                  <span className="text-sm text-text-muted">{t("Chưa triển khai trên mạng này", "Not deployed on this network")}</span>
                )}
              </Card>
            );
          })}
        </ul>
      </section>

      {isConnected && address && (
        <Card size="sm" padding="sm" className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-muted">
          <span>{t("Ví đang kết nối:", "Connected wallet:")}</span>
          <Address value={address} chars={6} />
        </Card>
      )}
    </>
  );
}
