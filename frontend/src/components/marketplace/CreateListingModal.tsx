"use client";

import React, { useId, useState } from "react";
import { BadgeCheck, Wallet } from "lucide-react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContracts, useSignMessage } from "wagmi";
import { Address, Alert, Button, Field, Input, Modal, Select, SkeletonText, Textarea, TxButton } from "@/components/ui";
import { MarketplaceABI } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useContractTx } from "@/hooks/useContractTx";
import type { Locale } from "@/lib/i18n";
import {
  EXPERIENCE_TYPE,
  LISTING_LIMITS,
  PRODUCT_TYPES,
  buildUploadMessage,
  encodeDataJsonUri,
  normalizeListingDetails,
  validateListingText,
  type ListingDetailField,
  type ProductTypeValue,
} from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";
import { useWalletModal } from "@/providers/WalletModal";
import { SplitBreakdown } from "./SplitBreakdown";

interface CreateListingModalProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  pType: 0 as ProductTypeValue,
  artisan: "",
  village: "",
  contact: "",
  schedule: "",
};
type FormState = typeof EMPTY_FORM;

function parsePrice(value: string): bigint | null {
  try {
    const wei = parseEther(value.trim().replace(",", "."));
    return wei > 0n ? wei : null;
  } catch {
    return null;
  }
}

/** Ghim metadata lên IPFS; khi IPFS chưa cấu hình và không có ảnh thì dùng JSON nội tuyến. */
async function uploadMetadata(
  fields: { name: string; description: string; details: Partial<Record<ListingDetailField, string>> },
  image: File | null,
  auth: { address: string; timestamp: number; signature: string; locale: Locale },
  messages: { ipfsDisabled: string; uploadFailed: string },
) {
  const body = new FormData();
  body.append("address", auth.address);
  body.append("timestamp", String(auth.timestamp));
  body.append("signature", auth.signature);
  body.append("locale", auth.locale);
  body.append("name", fields.name);
  body.append("description", fields.description);
  for (const [key, value] of Object.entries(fields.details)) body.append(key, value);
  if (image) body.append("image", image);

  const response = await fetch("/api/ipfs/metadata", { method: "POST", body });
  const data = (await response.json().catch(() => ({}))) as { uri?: string; error?: string; code?: string };

  if (response.ok && data.uri) return data.uri;
  if (data.code === "IPFS_DISABLED" && !image) {
    return encodeDataJsonUri({ name: fields.name, description: fields.description, ...fields.details });
  }
  throw new Error(data.code === "IPFS_DISABLED" ? messages.ipfsDisabled : data.error || messages.uploadFailed);
}

/** Điều kiện đăng bán của ví đang kết nối, đọc từ Marketplace. */
function useSellerEligibility(enabled: boolean) {
  const { addresses, chainId } = useActiveChain();
  const { address } = useAccount();
  const market = { address: addresses.marketplace, abi: MarketplaceABI, chainId } as const;
  const rules = useReadContracts({
    contracts: [
      { ...market, functionName: "artisanVerificationRequired" },
      { ...market, functionName: "verifiedArtisan", args: [address ?? "0x0000000000000000000000000000000000000000"] },
      { ...market, functionName: "minListingPrice" },
    ],
    query: { enabled: enabled && Boolean(address) },
  });
  const [required, verified, minPrice] = rules.data ?? [];
  return {
    isLoading: rules.isLoading,
    // Không đọc được (Marketplace cũ chưa có xác thực) ⇒ coi như không bắt buộc.
    notVerified: required?.result === true && verified?.result === false,
    minPrice: typeof minPrice?.result === "bigint" ? minPrice.result : undefined,
  };
}

/**
 * Đăng bán sản phẩm. Khi mở, kiểm tra ngay ví đã kết nối và đã được xác thực nghệ nhân chưa;
 * chưa đủ điều kiện thì hiện hướng dẫn thay cho form (không để điền xong mới báo lỗi).
 */
export function CreateListingModal({ open, onClose }: CreateListingModalProps) {
  const { locale, t } = useI18n();
  const formId = useId();
  const { addresses } = useActiveChain();
  const { address: account, isConnected } = useAccount();
  const { open: openWalletModal } = useWalletModal();
  const { signMessageAsync } = useSignMessage();
  const { send, status, isBusy } = useContractTx({
    pending: t("Đang đăng bán sản phẩm", "Listing your product"),
    success: t("Đăng bán thành công!", "Product listed!"),
  });
  const eligibility = useSellerEligibility(open);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const busy = uploading || isBusy;

  const price = parsePrice(form.price);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const isTour = form.pType === EXPERIENCE_TYPE;

  const handleImage = (file: File | null) => {
    setError(null);
    if (file && file.size > LISTING_LIMITS.imageBytes) {
      setError(t("Ảnh tối đa 2MB.", "Images can be at most 2 MB."));
      setImage(null);
      return;
    }
    setImage(file);
  };

  const submit = async () => {
    const textError = validateListingText(form.name, form.description, locale);
    if (textError) return setError(textError);
    if (!price) return setError(t("Giá không hợp lệ (ví dụ: 0.01).", "Invalid price (example: 0.01)."));
    if (eligibility.minPrice !== undefined && price < eligibility.minPrice) {
      return setError(
        t(`Giá tối thiểu là ${formatEther(eligibility.minPrice)} ETH.`, `The minimum price is ${formatEther(eligibility.minPrice)} ETH.`),
      );
    }
    setError(null);

    let metadataURI: string;
    try {
      setUploading(true);
      const timestamp = Date.now();
      const signature = await signMessageAsync({ message: buildUploadMessage(account as string, timestamp, locale) });
      metadataURI = await uploadMetadata(
        {
          name: form.name.trim(),
          description: form.description.trim(),
          details: normalizeListingDetails({ ...form, schedule: isTour ? form.schedule : "" }),
        },
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
    // Đóng cả khi "unconfirmed": giao dịch đã gửi, gửi lại sẽ tạo trùng.
    if (result) {
      setForm(EMPTY_FORM);
      setImage(null);
      onClose();
    }
  };

  const title = t("Đăng bán sản phẩm", "List a product");

  // 1) Chưa kết nối ví.
  if (!isConnected || !account) {
    return (
      <Modal open={open} onClose={onClose} title={title} size="sm" footer={<Button icon={Wallet} onClick={openWalletModal}>{t("Kết nối ví", "Connect wallet")}</Button>}>
        <p className="text-sm text-text-muted">
          {t(
            "Kết nối ví nghệ nhân để đăng bán. Tiền bán hàng sẽ được chuyển thẳng về ví này sau khi người mua xác nhận.",
            "Connect your artisan wallet to list a product. Sales are paid straight to this wallet once the buyer confirms.",
          )}
        </p>
      </Modal>
    );
  }

  // 2) Đang kiểm tra điều kiện.
  if (eligibility.isLoading) {
    return (
      <Modal open={open} onClose={onClose} title={title} size="sm">
        <div role="status" aria-busy="true">
          <SkeletonText lines={3} />
          <span className="sr-only">{t("Đang kiểm tra ví nghệ nhân…", "Checking your artisan wallet…")}</span>
        </div>
      </Modal>
    );
  }

  // 3) Ví chưa được xác thực: hướng dẫn đăng ký thay cho form.
  if (eligibility.notVerified) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={t("Đăng ký làm nghệ nhân", "Become a verified artisan")}
        size="sm"
        footer={<Button variant="secondary" onClick={onClose}>{t("Đã hiểu", "Got it")}</Button>}
      >
        <div className="space-y-4 text-sm">
          <Alert tone="info" icon={BadgeCheck} title={t("Ví này chưa được xác thực nghệ nhân", "This wallet is not a verified artisan yet")}>
            {t(
              "Để bảo vệ du khách, chỉ ngư dân và nghệ nhân đã được ban điều hành xác minh mới đăng bán được.",
              "To protect travellers, only fishers and artisans verified by the operators can list products.",
            )}
          </Alert>
          <ol className="list-decimal space-y-2 pl-5 text-text">
            <li>{t("Chuẩn bị tên, làng chài và ảnh sản phẩm hoặc tour của bạn.", "Prepare your name, village and photos of your product or tour.")}</li>
            <li>
              {t("Gửi địa chỉ ví dưới đây cho ban điều hành San Hô Xanh:", "Send the wallet address below to the BlueReef Travel operators:")}{" "}
              <Address value={account} />
            </li>
            <li>{t("Sau khi được xác thực, mở lại mục này để đăng bán.", "Once verified, open this again to list your product.")}</li>
          </ol>
        </div>
      </Modal>
    );
  }

  // 4) Đủ điều kiện: form đăng bán.
  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={title}
      description={t(
        "Sản phẩm được ghi công khai; tiền bán hàng được giữ an toàn rồi tự động chia khi người mua xác nhận.",
        "Products are recorded publicly; payments are held safely and split automatically once the buyer confirms.",
      )}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("Huỷ", "Cancel")}
          </Button>
          {/* Không dùng type="submit": khi sai mạng, nút "Chuyển mạng" của TxButton không được gửi form. */}
          <TxButton
            status={uploading ? "pending" : status}
            busyLabels={{ pending: uploading ? t("Đang tải lên IPFS…", "Uploading to IPFS…") : t("Đang chờ mạng xác nhận…", "Waiting for on-chain confirmation…") }}
            onClick={() => (busy ? undefined : submit())}
          >
            {t("Đăng bán", "List product")}
          </TxButton>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void submit();
        }}
        className="space-y-4"
      >
        <Field label={t("Tên sản phẩm", "Product name")} required>
          <Input
            value={form.name}
            maxLength={LISTING_LIMITS.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={t("VD: Đèn ngủ vỏ sò làng chài Nhơn Lý", "E.g. Seashell night lamp from Nhon Ly village")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Loại sản phẩm", "Product type")}>
            <Select value={form.pType} onChange={(e) => set({ pType: Number(e.target.value) as ProductTypeValue })}>
              {PRODUCT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {t<string>(type.label, type.labelEn)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Giá (ETH)", "Price (ETH)")} required>
            <Input className="tabular-nums" inputMode="decimal" value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="0.01" />
          </Field>
        </div>

        <Field label={t("Mô tả", "Description")} hint={t("Chất liệu, nguồn gốc, câu chuyện của bạn…", "Materials, origin, your story…")}>
          <Textarea rows={3} value={form.description} maxLength={LISTING_LIMITS.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Tên nghệ nhân / ngư dân", "Artisan / fisher name")}>
            <Input value={form.artisan} maxLength={120} onChange={(e) => set({ artisan: e.target.value })} placeholder={t("VD: Cô Lan", "E.g. Ms. Lan")} />
          </Field>
          <Field label={t("Làng chài / địa phương", "Fishing village")}>
            <Input value={form.village} maxLength={120} onChange={(e) => set({ village: e.target.value })} placeholder={t("VD: Nhơn Lý, Quy Nhơn", "E.g. Nhon Ly, Quy Nhon")} />
          </Field>
        </div>

        <Field
          label={t("Kênh liên hệ để hẹn giao hàng", "Contact channel for delivery")}
          hint={t(
            "Số Zalo, email hoặc link trang. Thông tin này hiển thị công khai cho người mua.",
            "Phone, email or a page link. This is shown publicly to buyers.",
          )}
        >
          <Input value={form.contact} maxLength={120} onChange={(e) => set({ contact: e.target.value })} placeholder="0905 123 456" />
        </Field>

        {isTour && (
          <Field label={t("Lịch tour", "Tour schedule")} hint={t("VD: Khởi hành 6:30 hằng ngày, đón tại cảng cá.", "E.g. Departs 6:30 daily from the fishing port.")}>
            <Input value={form.schedule} maxLength={120} onChange={(e) => set({ schedule: e.target.value })} />
          </Field>
        )}

        <Field label={t("Ảnh sản phẩm", "Product image")} hint={t("PNG, JPEG, WebP hoặc GIF, tối đa 2 MB.", "PNG, JPEG, WebP or GIF, up to 2 MB.")}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
            className="block min-h-11 w-full text-sm text-text-muted file:mr-3 file:min-h-11 file:rounded-sm file:border-0 file:bg-primary-soft file:px-4 file:font-semibold file:text-primary"
          />
        </Field>

        {price && (
          <div className="rounded-md bg-bg p-4">
            <p className="mb-2 text-sm font-medium text-text">{t("Khi có người mua, tiền được chia:", "When someone buys, the payment is split:")}</p>
            <SplitBreakdown price={price} compact />
          </div>
        )}

        {error && <Alert tone="danger">{error}</Alert>}
      </form>
    </Modal>
  );
}
