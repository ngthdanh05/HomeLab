"use client";

import React from "react";
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
      <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-5 shadow-sm">
        <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
          <span className="text-xl">✅</span> {t("Nên làm", "Do")}
        </h3>
        <ul className="space-y-2">
          {dos.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-slate-300 text-sm leading-relaxed"
            >
              <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Don'ts */}
      <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-5 shadow-sm">
        <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
          <span className="text-xl">❌</span> {t("Không nên làm", "Don't")}
        </h3>
        <ul className="space-y-2">
          {donts.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-slate-300 text-sm leading-relaxed"
            >
              <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
