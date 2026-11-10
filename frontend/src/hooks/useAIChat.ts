"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createSSEParser } from "@/lib/sse";
import { useI18n } from "@/providers/LocaleProvider";
import type { ChatContext } from "@/types/ai";

export type { ChatContext };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") return data.error;
  } catch {
    // Non-JSON error body (e.g. proxy HTML page).
  }
  return fallback;
}

const HISTORY_MESSAGES = 8;
const HISTORY_CHARS = 1000;

export function useAIChat() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Abort any in-flight stream when the component using the hook unmounts.
  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const updateMessage = useCallback(
    (id: string, update: (content: string) => string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id ? { ...msg, content: update(msg.content) } : msg,
        ),
      );
    },
    [],
  );

  const sendMessage = useCallback(
    async (message: string, context?: ChatContext) => {
      if (!message.trim() || abortControllerRef.current) return;

      const now = new Date();
      const assistantMessageId = crypto.randomUUID();
      // Earlier turns, so follow-up questions keep their context on the (stateless) API.
      const history = messagesRef.current
        .filter((m) => m.content && !m.content.startsWith("⚠️"))
        .slice(-HISTORY_MESSAGES)
        .map((m) => ({ role: m.role === "user" ? "user" : "model", text: m.content.slice(0, HISTORY_CHARS) }));
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: message, timestamp: now },
        { id: assistantMessageId, role: "assistant", content: "", timestamp: now },
      ]);
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, context, history }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response, t("Không thể kết nối tới AI. Vui lòng thử lại.", "Could not connect to the AI. Please try again.")));
        }
        if (!response.body) throw new Error(t("Không nhận được phản hồi từ AI.", "No response from the AI."));

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parse = createSSEParser();

        streamLoop: while (true) {
          const { done, value } = await reader.read();
          // `stream: true` keeps multi-byte characters split across chunks intact.
          const events = parse(decoder.decode(value, { stream: !done }));

          for (const event of events) {
            if (event.type === "text") {
              updateMessage(assistantMessageId, (c) => c + event.text);
            } else if (event.type === "error") {
              throw new Error(event.error);
            } else {
              break streamLoop;
            }
          }

          if (done) break;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        const errorMsg = err instanceof Error ? err.message : t("Đã xảy ra lỗi", "Something went wrong");
        setError(errorMsg);
        updateMessage(
          assistantMessageId,
          (c) => `${c ? `${c}\n\n` : ""}⚠️ ${t("Xin lỗi, đã xảy ra lỗi", "Sorry, an error occurred")}: ${errorMsg}`,
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsLoading(false);
        }
      }
    },
    [updateMessage, t],
  );

  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setMessages([]);
    setError(null);
  }, []);

  const stopGenerating = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    stopGenerating,
  };
}
