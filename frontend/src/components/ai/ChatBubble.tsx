"use client";

import React from "react";
import { ChatMessage } from "@/hooks/useAIChat";
import { intlLocale } from "@/lib/i18n";
import { useI18n } from "@/providers/LocaleProvider";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const { locale } = useI18n();
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 animate-fade-in`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      )}

      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isUser
            ? "bg-emerald-700 text-white rounded-tr-sm"
            : "bg-slate-700 text-slate-100 rounded-tl-sm"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content || (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          )}
        </p>
        <p className={`text-xs mt-1 ${isUser ? "text-emerald-200" : "text-slate-400"}`}>
          {message.timestamp.toLocaleTimeString(intlLocale(locale), {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center ml-2 flex-shrink-0 mt-1">
          <span className="text-slate-200 text-xs">👤</span>
        </div>
      )}
    </div>
  );
}
