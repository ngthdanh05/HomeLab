/**
 * Tên icon dùng trong dữ liệu (lib/, data/). Giữ lib thuần TypeScript, không import React:
 * component hiển thị bằng `<AppIcon name={...} />` (components/ui/AppIcon.tsx).
 */
export const ICON_NAMES = [
  // Loại sản phẩm
  "handicraft",
  "food",
  "experience",
  // Huy hiệu
  "badge-eco-checkin",
  "badge-zero-carbon",
  "badge-culture-guardian",
  "badge-community-donor",
  // Nhiệm vụ
  "quest-first-craft",
  "quest-three-crafts",
  "quest-first-offset",
  "quest-offset-100kg",
  "quest-dao-vote",
  "quest-heritage-360",
  // Phương tiện
  "plane",
  "car",
  "motorbike",
  "bus",
  "train",
  "boat",
  "bicycle",
  // Trạng thái đề xuất
  "status-pending",
  "status-active",
  "status-queued",
  "status-expired",
  "status-cancelled",
  "status-passed",
  "status-defeated",
  "status-no-quorum",
  "status-executed",
  "status-rejected",
] as const;

export type IconName = (typeof ICON_NAMES)[number];
