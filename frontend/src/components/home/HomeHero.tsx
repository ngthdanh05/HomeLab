"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, HandHeart, SendHorizontal, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { HERO_IMAGE } from "@/data/oceanDestinations";
import { ASSISTANT_QUERY_MAX_LENGTH, getOceanQuestions } from "@/data/oceanQuestions";
import { useI18n } from "@/providers/LocaleProvider";

const assistantHref = (question: string) => `/assistant?q=${encodeURIComponent(question)}`;

/** Ô hỏi nhanh: gửi câu hỏi sang /assistant (form GET vẫn chạy khi JS chưa tải xong). */
function QuickAsk() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [question, setQuestion] = useState("");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = question.trim();
    if (!q) return;
    router.push(assistantHref(q));
  };

  return (
    <div className="rounded-lg bg-surface p-4 text-text shadow-overlay sm:p-5">
      <form action="/assistant" method="get" onSubmit={submit} role="search" className="flex gap-2">
        <label htmlFor="quick-ask" className="sr-only">
          {t("Hỏi trợ lý biển", "Ask the ocean assistant")}
        </label>
        <span className="relative flex-1">
          <Sparkles aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
          <input
            id="quick-ask"
            name="q"
            type="text"
            maxLength={ASSISTANT_QUERY_MAX_LENGTH}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("Hỏi về mùa lặn, điểm ngắm san hô…", "Ask about dive seasons, reef spots…")}
            className="h-12 w-full rounded-md border border-border-strong bg-surface pl-10 pr-3 text-base text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </span>
        <button
          type="submit"
          aria-label={t("Gửi câu hỏi", "Send question")}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <SendHorizontal aria-hidden className="h-5 w-5" />
          <span className="hidden sm:inline">{t("Hỏi", "Ask")}</span>
        </button>
      </form>

      <p className="mb-2 mt-4 text-xs font-medium text-text-muted">{t("Gợi ý cho bạn", "Try asking")}</p>
      {/* Mobile: một hàng cuộn ngang để hero vẫn vừa màn hình đầu tiên. */}
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {getOceanQuestions(locale).map((q) => (
          <li key={q} className="shrink-0 sm:shrink">
            <Link
              href={assistantHref(q)}
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-bg px-4 py-2 text-sm text-text transition-colors hover:border-primary hover:bg-primary-soft"
            >
              {q}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeHero() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-text">
      <Image
        src={HERO_IMAGE.src}
        alt={t(HERO_IMAGE.alt, HERO_IMAGE.altEn)}
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      {/* Lớp phủ tối đều màu để chữ trắng luôn đủ tương phản trên mọi vùng ảnh. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-text/65" />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12 lg:px-8 lg:py-24">
        <div className="text-white">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">
            {t("Du lịch biển bền vững", "Sustainable ocean travel")}
          </p>
          <h1 id="hero-title" className="text-3xl font-bold leading-tight sm:text-5xl">
            {t("Khám phá đại dương xanh, gìn giữ từng rạn san hô", "Explore the blue ocean, protect every coral reef")}
          </h1>
          <p className="mt-4 max-w-xl text-base text-white sm:text-lg">
            {t(
              "Lặn ngắm san hô, ghé làng chài và mua sản vật tận tay ngư dân. Một phần mỗi chuyến đi quay về Quỹ bảo tồn biển do cộng đồng quyết định.",
              "Snorkel the reefs, visit fishing villages and buy straight from fishers. Part of every trip goes back to a marine conservation fund the community decides on.",
            )}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/assistant" size="lg" icon={Compass}>
              {t("Lên kế hoạch lặn & khám phá", "Plan a dive & explore")}
            </ButtonLink>
            <ButtonLink href="/marketplace" size="lg" variant="secondary" icon={HandHeart}>
              {t("Ủng hộ làng chài", "Support fishing villages")}
            </ButtonLink>
          </div>
        </div>

        <QuickAsk />
      </div>
      <p className="absolute bottom-1 right-2 text-xs text-white">{t("Ảnh minh hoạ: Unsplash", "Illustrative photo: Unsplash")}</p>
    </section>
  );
}
