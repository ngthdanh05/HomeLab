import React from "react";
import {
  Amphora,
  Ban,
  Bike,
  Bus,
  Car,
  CircleCheck,
  CirclePause,
  CircleX,
  Compass,
  CookingPot,
  Earth,
  Hand,
  HandCoins,
  Handshake,
  Hourglass,
  Landmark,
  Leaf,
  Lock,
  Motorbike,
  Plane,
  Ship,
  ShoppingBasket,
  ThumbsDown,
  TimerOff,
  TrainFront,
  Trees,
  Vote,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { IconName } from "@/lib/icon-names";

/** Ánh xạ tên icon trong dữ liệu → component lucide-react. */
export const APP_ICONS: Record<IconName, LucideIcon> = {
  handicraft: ShoppingBasket,
  food: CookingPot,
  experience: Compass,

  "badge-eco-checkin": Leaf,
  "badge-zero-carbon": Earth,
  "badge-culture-guardian": Landmark,
  "badge-community-donor": Handshake,

  "quest-first-craft": ShoppingBasket,
  "quest-three-crafts": Amphora,
  "quest-first-offset": Earth,
  "quest-offset-100kg": Trees,
  "quest-dao-vote": Vote,
  "quest-heritage-360": Landmark,

  plane: Plane,
  car: Car,
  motorbike: Motorbike,
  bus: Bus,
  train: TrainFront,
  boat: Ship,
  bicycle: Bike,

  "status-pending": Hourglass,
  "status-active": Vote,
  "status-queued": Lock,
  "status-expired": TimerOff,
  "status-cancelled": Ban,
  "status-passed": CircleCheck,
  "status-defeated": ThumbsDown,
  "status-no-quorum": CirclePause,
  "status-executed": HandCoins,
  "status-rejected": CircleX,
};

export interface AppIconProps extends LucideProps {
  name: IconName;
}

/** Icon trang trí theo tên trong dữ liệu; mặc định `aria-hidden` (luôn có chữ đi kèm). */
export function AppIcon({ name, className = "h-4 w-4", ...rest }: AppIconProps) {
  const Icon = APP_ICONS[name] ?? Hand;
  return <Icon aria-hidden className={className} {...rest} />;
}
