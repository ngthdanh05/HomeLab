"use client";

import React, { useEffect, useId, useState } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useModal } from "connectkit";
import { MarketplaceABI } from "@/config/contracts";
import { useContractTx } from "@/hooks/useContractTx";
import { useActiveChain } from "@/hooks/useActiveChain";
import {
  LISTING_LIMITS,
  PRODUCT_TYPES,
  encodeDataJsonUri,
  validateListingText,
  type ProductTypeValue,
} from "@/lib/marketplace";
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
async function uploadMetadata(name: string, description: string, image: File | null) {
  const body = new FormData();
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
    data.code === "IPFS_DISABLED"
      ? "IPFS chưa được cấu hình nên chưa tải được ảnh. Hãy bỏ ảnh hoặc cấu hình PINATA_JWT."
      : data.error || "Không tải được dữ liệu sản phẩm lên IPFS.",
  );
}

export function CreateListingModal({ open, onClose }: CreateListingModalProps) {
  const formId = useId();
  const { addresses } = useActiveChain();
  const { isConnected } = useAccount();
  const { setOpen: setConnectModalOpen } = useModal();
  const { send, isBusy } = useContractTx({
    pending: "Đang đăng bán sản phẩm",
    success: "Đăng bán thành công! 🎉",
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const busy = uploading || isBusy;

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
      setError("Ảnh tối đa 2MB.");
      setImage(null);
      return;
    }
    setImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const textError = validateListingText(form.name, form.description);
    if (textError) return setError(textError);
    if (!price) return setError("Giá không hợp lệ (ví dụ: 0.01).");
    setError(null);
    // Connect before uploading so we don't pin metadata for a listing never created.
    if (!isConnected) return setConnectModalOpen(true);

    let metadataURI: string;
    try {
      setUploading(true);
      metadataURI = await uploadMetadata(form.name.trim(), form.description.trim(), image);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu sản phẩm.");
      return;
    } finally {
      setUploading(false);
    }

    const receipt = await send({
      address: addresses.marketplace,
      abi: MarketplaceABI,
      functionName: "createListing",
      args: [price, form.pType, metadataURI],
    });
    if (receipt) {
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
              🧺 Đăng bán sản phẩm
            </h2>
            <p className="text-xs text-slate-400">
              Sản phẩm được ghi on-chain, tiền bán hàng tự động chia qua Smart Contract.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
            className="text-slate-400 hover:text-white disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={`${formId}-name`} className="mb-1 block text-xs font-medium text-slate-300">
              Tên sản phẩm *
            </label>
            <input
              id={`${formId}-name`}
              className={inputClass}
              value={form.name}
              maxLength={LISTING_LIMITS.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Đèn lồng lụa Hội An làm thủ công"
              required
            />
          </div>

          <div>
            <label htmlFor={`${formId}-desc`} className="mb-1 block text-xs font-medium text-slate-300">
              Mô tả
            </label>
            <textarea
              id={`${formId}-desc`}
              className={`${inputClass} resize-none`}
              rows={3}
              value={form.description}
              maxLength={LISTING_LIMITS.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Chất liệu, nguồn gốc, câu chuyện của nghệ nhân…"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${formId}-price`} className="mb-1 block text-xs font-medium text-slate-300">
                Giá (ETH) *
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
                Loại sản phẩm
              </label>
              <select
                id={`${formId}-type`}
                className={inputClass}
                value={form.pType}
                onChange={(e) =>
                  setForm({ ...form, pType: Number(e.target.value) as ProductTypeValue })
                }
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor={`${formId}-image`} className="mb-1 block text-xs font-medium text-slate-300">
              Ảnh sản phẩm (PNG/JPEG/WebP/GIF, tối đa 2MB)
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
              <p className="mb-2 text-xs font-medium text-slate-300">Khi có người mua, bạn nhận:</p>
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400"
          >
            {busy && <Spinner />}
            {uploading ? "Đang tải lên IPFS…" : isBusy ? "Đang chờ giao dịch…" : "Đăng bán"}
          </button>
        </form>
      </div>
    </div>
  );
}
