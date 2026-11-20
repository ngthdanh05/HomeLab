"use client";

import React from "react";
import Link from "next/link";
import { useAccount, useSwitchChain } from "wagmi";
import { ArrowRight, CircleCheck, Droplets, ExternalLink, KeyRound, Network, Wallet, type LucideIcon } from "lucide-react";
import { Alert, Button, ButtonLink, Card, PageHeader } from "@/components/ui";
import { DEFAULT_CHAIN_ID, getChainName } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useI18n } from "@/providers/LocaleProvider";
import { useWalletModal } from "@/providers/WalletModal";

const FAUCETS = [
  { name: "Google Cloud Web3 Faucet", href: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia" },
  { name: "Alchemy Sepolia Faucet", href: "https://www.alchemy.com/faucets/ethereum-sepolia" },
  { name: "Sepolia PoW Faucet", href: "https://sepolia-faucet.pk910.de/" },
] as const;

function ExternalAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-2 font-medium text-primary underline-offset-2 hover:underline"
    >
      {children}
      <ExternalLink aria-hidden className="h-4 w-4 shrink-0" />
    </a>
  );
}

function Step({
  n,
  Icon,
  title,
  done,
  children,
}: {
  n: number;
  Icon: LucideIcon;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Card as="li" className="flex gap-4">
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-base font-bold tabular-nums text-primary"
      >
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-text">
          <Icon aria-hidden className="h-5 w-5 text-primary" />
          {title}
          {done && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-primary-soft px-2 py-1 text-xs font-medium text-primary">
              <CircleCheck aria-hidden className="h-4 w-4" />
              {t("Đã xong", "Done")}
            </span>
          )}
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-text-muted">{children}</div>
      </div>
    </Card>
  );
}

export default function GettingStartedPage() {
  const { t } = useI18n();
  const { isConnected } = useAccount();
  const { isWrongNetwork } = useActiveChain();
  const { switchChain, isPending } = useSwitchChain();
  const { open: openWalletModal } = useWalletModal();
  const network = getChainName(DEFAULT_CHAIN_ID);
  const isLocal = DEFAULT_CHAIN_ID === 31337;

  return (
    <>
      <PageHeader
        eyebrow={t("Người mới", "New here")}
        icon={Wallet}
        title={t("Bắt đầu với ví trong 3 bước", "Get started with a wallet in 3 steps")}
        description={t(
          "Bạn có thể xem mọi trang mà không cần ví. Ví chỉ cần khi mua sản vật, bù đắp carbon hay bỏ phiếu cho Quỹ bảo tồn biển.",
          "You can browse every page without a wallet. You only need one to buy products, offset carbon or vote on the Ocean Conservation Fund.",
        )}
      />

      <Alert tone="warning" title={t("Đây là mạng thử nghiệm", "This is a test network")}>
        {t(
          `Ứng dụng đang chạy trên ${network}. ETH thử nghiệm, ECO và huy hiệu ở đây không có giá trị tiền tệ. Đừng gửi ETH thật vào các địa chỉ trên trang này.`,
          `The app runs on ${network}. Test ETH, ECO and badges here have no monetary value. Never send real ETH to any address on this site.`,
        )}
      </Alert>

      <ol className="space-y-4">
        <Step n={1} Icon={Wallet} title={t("Cài ví MetaMask", "Install the MetaMask wallet")} done={isConnected}>
          <p>
            {t(
              "Cài tiện ích MetaMask cho trình duyệt hoặc ứng dụng trên điện thoại, tạo ví mới và chép cụm từ khôi phục ra giấy.",
              "Install the MetaMask browser extension or mobile app, create a new wallet and write the recovery phrase down on paper.",
            )}
          </p>
          <p className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-text">
            <KeyRound aria-hidden className="mt-px h-4 w-4 shrink-0 text-danger" />
            {t(
              "Không ai, kể cả chúng tôi, được hỏi cụm từ khôi phục của bạn. Ai có cụm từ đó sẽ lấy được toàn bộ tài sản trong ví.",
              "Nobody, including us, should ever ask for your recovery phrase. Anyone who has it can take everything in your wallet.",
            )}
          </p>
          <div className="flex flex-wrap items-center gap-x-6">
            <ExternalAnchor href="https://metamask.io/download/">{t("Tải MetaMask", "Download MetaMask")}</ExternalAnchor>
            {!isConnected && (
              <Button variant="secondary" onClick={openWalletModal}>
                {t("Kết nối ví", "Connect Wallet")}
              </Button>
            )}
          </div>
        </Step>

        <Step
          n={2}
          Icon={Network}
          title={t(`Chuyển sang mạng ${network}`, `Switch to the ${network} network`)}
          done={isConnected && !isWrongNetwork}
        >
          <p>
            {isLocal
              ? t(
                  "Bản này dùng node Anvil cục bộ: thêm mạng với RPC http://127.0.0.1:8545, Chain ID 31337, ký hiệu ETH.",
                  "This build uses a local Anvil node: add a network with RPC http://127.0.0.1:8545, chain ID 31337, symbol ETH.",
                )
              : t(
                  "Sepolia là mạng thử nghiệm của Ethereum. Sau khi kết nối ví, bấm nút dưới đây để ví tự thêm và chuyển sang Sepolia.",
                  "Sepolia is Ethereum's test network. Once your wallet is connected, use the button below and the wallet will add and switch to Sepolia.",
                )}
          </p>
          {isConnected && isWrongNetwork && (
            <Button loading={isPending} onClick={() => switchChain({ chainId: DEFAULT_CHAIN_ID })}>
              {t(`Chuyển sang ${network}`, `Switch to ${network}`)}
            </Button>
          )}
        </Step>

        <Step n={3} Icon={Droplets} title={t("Nhận ETH thử nghiệm miễn phí", "Get free test ETH")}>
          <p>
            {isLocal
              ? t(
                  "Trên Anvil, nhập khoá riêng của một tài khoản dev (in ra khi khởi động anvil) vào MetaMask: mỗi tài khoản có sẵn 10 000 ETH thử nghiệm.",
                  "On Anvil, import the private key of a dev account (printed when anvil starts) into MetaMask: each one holds 10,000 test ETH.",
                )
              : t(
                  "Dán địa chỉ ví vào một trong các vòi (faucet) dưới đây. Khoảng 0,05 ETH thử nghiệm là đủ để mua vài sản phẩm và bù đắp carbon.",
                  "Paste your wallet address into one of the faucets below. About 0.05 test ETH is enough to buy a few products and offset carbon.",
                )}
          </p>
          {!isLocal && (
            <ul className="flex flex-col">
              {FAUCETS.map((f) => (
                <li key={f.href}>
                  <ExternalAnchor href={f.href}>{f.name}</ExternalAnchor>
                </li>
              ))}
            </ul>
          )}
        </Step>
      </ol>

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">{t("Sẵn sàng rồi?", "All set?")}</h2>
          <p className="mt-1 text-sm text-text-muted">
            {t(
              "Mua một sản vật từ làng chài để nhận ECO và huy hiệu đầu tiên, hoặc xem các hợp đồng tự động đang xử lý giao dịch.",
              "Buy a product from a fishing village to earn your first ECO and badge, or check the smart contracts that process each transaction.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/marketplace" iconRight={ArrowRight}>
            {t("Vào Chợ làng chài", "Visit the Village Market")}
          </ButtonLink>
          <Link href="/transparency" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
            {t("Minh bạch on-chain", "On-chain transparency")}
          </Link>
        </div>
      </Card>
    </>
  );
}
