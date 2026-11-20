"use client";

import React from "react";
import { CircleAlert, UserRound } from "lucide-react";
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
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      )}

      <div
        className={`max-w-[80%] px-4 py-3 rounded-lg ${
          isUser
            ? "bg-primary text-white rounded-tr-sm"
            : "bg-bg border border-border text-text rounded-tl-sm"
        }`}
      >
        {(message.content || !message.error) && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content || (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            )}
          </p>
        )}
        {message.error && (
          <p className={`flex items-start gap-2 text-sm leading-relaxed text-danger ${message.content ? "mt-3" : ""}`}>
            <CircleAlert aria-hidden className="mt-1 h-4 w-4 shrink-0" />
            <span>{message.error}</span>
          </p>
        )}
        <p className={`text-xs mt-1 ${isUser ? "text-white/80" : "text-text-muted"}`}>
          {message.timestamp.toLocaleTimeString(intlLocale(locale), {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center ml-2 flex-shrink-0 mt-1">
          <UserRound aria-hidden className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
