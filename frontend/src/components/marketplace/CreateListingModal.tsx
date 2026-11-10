"use client";

import React, { useEffect, useId, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContracts, useSignMessage } from "wagmi";
import { useWalletModal } from "@/providers/WalletModal";
import { MarketplaceABI } from "@/config/contracts";
import { useContractTx } from "@/hooks/useContractTx";
import { useActiveChain } from "@/hooks/useActiveChain";
import {
  LISTING_LIMITS,
  PRODUCT_TYPES,
  buildUploadMessage,
  encodeDataJsonUri,
  validateListingText,
  type ProductTypeValue,
} from "@/lib/marketplace";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/providers/LocaleProvider";
import { Spinner } from "./PurchaseButton";
import { SplitBreakdown } from "./SplitBreakdown";

interface CreateListingModalProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_FORM = { name: "", description: "", price: "", pType: 0 as ProductTypeValue };

function parsePrice(value: string): bigint | null {
  try {
    const wei = parseEther(value.trim().replace(",", "."));
    return wei > 0n ? wei : null;
  } catch {
    return null;
  }
}

/** Pins metadata to IPFS; falls back to inline JSON when IPFS isn't configured and there is no image. */
async function uploadMetadata(
  name: string,
  description: string,
  image: File | null,
  auth: { address: string; timestamp: number; signature: string; locale: Locale },
  messages: { ipfsDisabled: string; uploadFailed: string },
) {
  const body = new FormData();
  body.append("address", auth.address);
  body.append("timestamp", String(auth.timestamp));
  body.append("signature", auth.signature);
  body.append("locale", auth.locale);
  body.append("name", name);
  body.append("description", description);
  if (image) body.append("image", image);

  const response = await fetch("/api/ipfs/metadata", { method: "POST", body });
  const data = (await response.json().catch(() => ({}))) as {
    uri?: string;
    error?: string;
    code?: string;
  };

  if (response.ok && data.uri) return data.uri;
  if (data.code === "IPFS_DISABLED" && !image) return encodeDataJsonUri({ name, description });
  throw new Error(
    data.code === "IPFS_DISABLED" ? messages.ipfsDisabled : data.error || messages.uploadFailed,
  );
}

export function CreateListingModal({ open, onClose }: CreateListingModalProps) {
  const { locale, t } = useI18n();
  const formId = useId();
  const { addresses, chainId } = useActiveChain();
  const { address: account, isConnected } = useAccount();
  const { open: openWalletModal } = useWalletModal();
  const { signMessageAsync } = useSignMessage();
  const { send, status, isBusy } = useContractTx({
    pending: t("Đang đăng bán sản phẩm", "Listing your product"),
    success: t("Đăng bán thành công! 🎉", "Product listed! 🎉"),
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const busy = uploading || isBusy;

  const market = { address: addresses.marketplace, abi: MarketplaceABI, chainId } as const;
  const rules = useReadContracts({
    contracts: [
      { ...market, functionName: "artisanVerificationRequired" },
      { ...market, functionName: "verifiedArtisan", args: [account ?? "0x0000000000000000000000000000000000000000"] },
      { ...market, functionName: "minListingPrice" },
    ],
    query: { enabled: open },
  });
  const notVerified = Boolean(account) && rules.data?.[0]?.result === true && rules.data?.[1]?.result === false;
  const minPrice = typeof rules.data?.[2]?.result === "bigint" ? rules.data[2].result : undefined;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const price = parsePrice(form.price);

  const handleImage = (file: File | null) => {
    setError(null);
    if (file && file.size > LISTING_LIMITS.imageBytes) {
      setError(t("Ảnh tối đa 2MB.", "Images can be at most 2 MB."));
      setImage(null);
      return;
    }
    setImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const textError = validateListingText(form.name, form.description, locale);
    if (textError) return setError(textError);
    if (!price) return setError(t("Giá không hợp lệ (ví dụ: 0.01).", "Invalid price (example: 0.01)."));
    if (minPrice !== undefined && price < minPrice) {
      return setError(t(`Giá tối thiểu là ${formatEther(minPrice)} ETH.`, `The minimum price is ${formatEther(minPrice)} ETH.`));
    }
    if (notVerified) return setError(t("Ví của bạn chưa được xác thực là nghệ nhân nên chưa thể đăng bán.", "Your wallet has not been verified as an artisan, so it cannot list products yet."));
    setError(null);
    // Connect before uploading so we don't pin metadata for a listing never created.
    if (!isConnected) return openWalletModal();

    let metadataURI: string;
    try {
      setUploading(true);
      const timestamp = Date.now();
      const signature = await signMessageAsync({ message: buildUploadMessage(account as string, timestamp, locale) });
      metadataURI = await uploadMetadata(
        form.name.trim(),
        form.description.trim(),
        image,
        { address: account as string, timestamp, signature, locale },
        {
          ipfsDisabled: t(
            "IPFS chưa được cấu hình nên chưa tải được ảnh. Hãy bỏ ảnh hoặc cấu hình PINATA_JWT.",
            "IPFS is not configured, so the image cannot be uploaded. Remove the image or configure PINATA_JWT.",
          ),
          uploadFailed: t("Không tải được dữ liệu sản phẩm lên IPFS.", "Could not upload the product data to IPFS."),
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Không tải được dữ liệu sản phẩm.", "Could not upload the product data."));
      return;
    } finally {
      setUploading(false);
    }

    const result = await send({
      address: addresses.marketplace,
      abi: MarketplaceABI,
      functionName: "createListing",
      args: [price, form.pType, metadataURI],
    });
    // Close on "unconfirmed" too: the tx is already sent, resubmitting would duplicate it.
    if (result) {
      setForm(EMPTY_FORM);
      setImage(null);
      onClose();
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className="animate-fade-in max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id={`${formId}-title`} className="text-lg font-bold text-white">
              🧺 {t("Đăng bán sản phẩm", "List a product")}
            </h2>
            <p className="text-xs text-slate-400">
              {t("Sản phẩm được ghi on-chain, tiền bán hàng tự động chia qua Smart Contract.", "Products are recorded on-chain, and sales are split automatically by the smart contract.")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={t("Đóng", "Close")}
            className="text-slate-400 hover:text-white disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={`${formId}-name`} className="mb-1 block text-xs font-medium text-slate-300">
              {t("Tên sản phẩm *", "Product name *")}
            </label>
            <input
              id={`${formId}-name`}
              className={inputClass}
              value={form.name}
              maxLength={LISTING_LIMITS.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("VD: Đèn lồng lụa Hội An làm thủ công", "E.g. Handmade Hoi An silk lantern")}
              required
            />
          </div>

          <div>
            <label htmlFor={`${formId}-desc`} className="mb-1 block text-xs font-medium text-slate-300">
              {t("Mô tả", "Description")}
            </label>
            <textarea
              id={`${formId}-desc`}
              className={`${inputClass} resize-none`}
              rows={3}
              value={form.description}
              maxLength={LISTING_LIMITS.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("Chất liệu, nguồn gốc, câu chuyện của nghệ nhân…", "Materials, origin, the artisan's story…")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${formId}-price`} className="mb-1 block text-xs font-medium text-slate-300">
                {t("Giá (ETH) *", "Price (ETH) *")}
              </label>
              <input
                id={`${formId}-price`}
                className={`${inputClass} font-mono`}
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.01"
                required
              />
            </div>
            <div>
              <label htmlFor={`${formId}-type`} className="mb-1 block text-xs font-medium text-slate-300">
                {t("Loại sản phẩm", "Product type")}
              </label>
              <select
                id={`${formId}-type`}
                className={inputClass}
                value={form.pType}
                onChange={(e) =>
                  setForm({ ...form, pType: Number(e.target.value) as ProductTypeValue })
                }
              >
                {PRODUCT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {t<string>(type.label, type.labelEn)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor={`${formId}-image`} className="mb-1 block text-xs font-medium text-slate-300">
              {t("Ảnh sản phẩm (PNG/JPEG/WebP/GIF, tối đa 2MB)", "Product image (PNG/JPEG/WebP/GIF, up to 2 MB)")}
            </label>
            <input
              id={`${formId}-image`}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-slate-200 hover:file:bg-slate-600"
            />
          </div>

          {price && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
              <p className="mb-2 text-xs font-medium text-slate-300">{t("Khi có người mua, bạn nhận:", "When someone buys, the payment is split:")}</p>
              <SplitBreakdown price={price} compact />
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-red-700/50 bg-red-900/30 p-3 text-sm text-red-300">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400"
          >
            {busy && <Spinner />}
            {uploading
              ? t("Đang tải lên IPFS…", "Uploading to IPFS…")
              : status === "awaiting-wallet"
                ? t("Xác nhận trong ví…", "Confirm in wallet…")
                : status === "pending"
                  ? t("Đang chờ xác nhận on-chain…", "Waiting for on-chain confirmation…")
                  : t("Đăng bán", "List product")}
          </button>
        </form>
      </div>
    </div>
  );
}
