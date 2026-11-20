"use client";

import React from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { useI18n } from "@/providers/LocaleProvider";

export interface DosDontsProps {
  dos: string[];
  donts: string[];
}

export function DosDonts({ dos, donts }: DosDontsProps) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Dos */}
      <div className="bg-primary-soft border border-primary/30 rounded-md p-5">
        <h3 className="text-primary font-bold mb-3 flex items-center gap-2">
          <CircleCheck aria-hidden className="h-5 w-5" />
          {t("Nên làm", "Do")}
        </h3>
        <ul className="space-y-2">
          {dos.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-text-muted text-sm leading-relaxed"
            >
              <span aria-hidden className="text-primary flex-shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Don'ts */}
      <div className="bg-danger-soft border border-danger/30 rounded-md p-5">
        <h3 className="text-danger font-bold mb-3 flex items-center gap-2">
          <CircleX aria-hidden className="h-5 w-5" />
          {t("Không nên làm", "Don't")}
        </h3>
        <ul className="space-y-2">
          {donts.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-text-muted text-sm leading-relaxed"
            >
              <span aria-hidden className="text-danger flex-shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
