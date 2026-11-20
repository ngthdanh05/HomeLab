"use client";

import React, { useState, useRef, useEffect } from "react";
import { CircleAlert, Leaf, Map as MapIcon, MessageCircle, SendHorizontal, Square } from "lucide-react";
import { useAIChat, ChatContext } from "@/hooks/useAIChat";
import { ChatBubble } from "./ChatBubble";
import { ItineraryCard } from "./ItineraryCard";
import { useI18n } from "@/providers/LocaleProvider";
import type { Itinerary } from "@/types/ai";
import { getOceanQuestions } from "@/data/oceanQuestions";

const CHAT_CONTEXT: ChatContext = { carbonPreference: "low" };


interface TravelAssistantProps {
  /** Câu hỏi gửi ngay khi mở (từ ô hỏi nhanh trên trang chủ, qua `/assistant?q=`). */
  initialQuestion?: string;
  /** Gọi sau khi đã gửi `initialQuestion` (trang dùng để xoá `?q=` khỏi URL). */
  onInitialQuestionSent?: () => void;
}

export function TravelAssistant({ initialQuestion, onInitialQuestionSent }: TravelAssistantProps = {}) {
  const { locale, t } = useI18n();
  const { messages, isLoading, error, sendMessage, clearChat, stopGenerating } =
    useAIChat();
  // Ref giữ nguyên qua lần chạy effect kép của StrictMode ⇒ câu hỏi chỉ gửi một lần.
  const initialSentRef = useRef(false);
  const [input, setInput] = useState("");
  const [showItinerary, setShowItinerary] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [itineraryError, setItineraryError] = useState<string | null>(null);
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll only the chat panel (scrollIntoView also scrolled the page, so the
    // home page jumped past the hero on load), and only once there are messages.
    const panel = messagesRef.current;
    if (!panel || messages.length === 0) return;
    // "auto" while streaming avoids the jumpy repeated smooth-scroll animation.
    panel.scrollTo({ top: panel.scrollHeight, behavior: isLoading ? "auto" : "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const question = initialQuestion?.trim();
    if (!question || initialSentRef.current) return;
    initialSentRef.current = true;
    void sendMessage(question, CHAT_CONTEXT);
    onInitialQuestionSent?.();
  }, [initialQuestion, onInitialQuestionSent, sendMessage]);

  const submitMessage = () => {
    if (!input.trim() || isLoading) return;
    const msg = input;
    setInput("");
    void sendMessage(msg, CHAT_CONTEXT);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submitMessage();
    }
  };

  const handleGenerateItinerary = async () => {
    if (!destination.trim() || itineraryLoading) return;
    setItineraryLoading(true);
    setItineraryError(null);
    try {
      const response = await fetch("/api/ai/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          days,
          interests: t(["biển đảo", "lặn ngắm san hô", "làng chài", "hải sản địa phương"], ["islands", "snorkelling", "fishing villages", "local seafood"]),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || t("Không thể tạo lịch trình. Vui lòng thử lại.", "Could not create the itinerary. Please try again."));
      }
      setItinerary(data as Itinerary);
    } catch (err) {
      setItinerary(null);
      setItineraryError(
        err instanceof Error ? err.message : t("Không thể tạo lịch trình. Vui lòng thử lại.", "Could not create the itinerary. Please try again."),
      );
    } finally {
      setItineraryLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-surface rounded-lg overflow-hidden border border-border">
      {/* Header */}
      <div className="bg-bg px-6 py-4 border-b border-border flex justify-between items-center">
        <div>
          <h2 className="flex items-center gap-2 text-text font-bold text-lg">
            <Leaf aria-hidden className="h-5 w-5 shrink-0 text-primary" />
            {t("Trợ lý biển", "Ocean assistant")}
          </h2>
          <p className="text-text-muted text-sm">
            {t("Lặn ngắm san hô và du lịch biển đảo có trách nhiệm", "Responsible reef diving and island travel")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowItinerary(!showItinerary)}
            className="inline-flex min-h-11 items-center gap-2 px-3 py-2 text-sm font-medium bg-primary hover:bg-primary-hover text-white rounded-md transition-colors"
          >
            {showItinerary ? (
              <>
                <MessageCircle aria-hidden className="h-4 w-4" />
                {t("Trò chuyện", "Chat")}
              </>
            ) : (
              <>
                <MapIcon aria-hidden className="h-4 w-4" />
                {t("Lịch trình", "Itinerary")}
              </>
            )}
          </button>
          <button
            onClick={clearChat}
            className="min-h-11 px-3 py-2 text-sm font-medium bg-surface border border-border hover:bg-primary-soft text-text rounded-md transition-colors"
          >
            {t("Xóa", "Clear")}
          </button>
        </div>
      </div>

      {showItinerary ? (
        /* Itinerary Panel */
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              aria-label={t("Điểm đến", "Destination")}
              maxLength={100}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={t("Nhập điểm đến (VD: Hội An, Sa Pa...)", "Enter a destination (e.g. Hoi An, Sa Pa...)")}
              className="min-h-11 flex-1 bg-surface border border-border-strong text-text rounded-sm px-4 py-2 focus:outline-none focus:border-primary"
            />
            <select
              aria-label={t("Số ngày", "Number of days")}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="min-h-11 bg-surface border border-border-strong text-text rounded-sm px-3 py-2 focus:outline-none focus:border-primary"
            >
              {[2, 3, 4, 5, 7].map((d) => (
                <option key={d} value={d}>
                  {d} {t("ngày", "days")}
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerateItinerary}
              disabled={!destination.trim() || itineraryLoading}
              className="min-h-11 px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-border disabled:text-text-muted text-white rounded-md transition-colors font-medium"
            >
              {itineraryLoading ? t("Đang tạo...", "Creating...") : t("Tạo lịch trình", "Create itinerary")}
            </button>
          </div>

          {itineraryError && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-danger-soft border border-danger/30 rounded-md p-3 text-danger text-sm"
            >
              <CircleAlert aria-hidden className="h-4 w-4 shrink-0 mt-px" />
              <span>{itineraryError}</span>
            </div>
          )}

          {itinerary && <ItineraryCard itinerary={itinerary} />}
        </div>
      ) : (
        /* Chat Panel */
        <>
          <div ref={messagesRef} className="flex-1 overflow-y-auto p-6 space-y-2">
            {messages.length === 0 && (
              <div className="text-center space-y-6 py-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Leaf aria-hidden className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-text-muted font-medium mb-1">
                    {t("Xin chào! Tôi là Trợ lý biển", "Hello! I'm your ocean travel assistant")}
                  </p>
                  <p className="text-text-muted text-sm">
                    {t(
                      "Hỏi tôi về mùa lặn, điểm ngắm san hô, văn hoá làng chài và cách đi biển không rác nhựa",
                      "Ask me about dive seasons, reef spots, fishing village culture and plastic-free beach trips",
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                  {getOceanQuestions(locale).map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(q, CHAT_CONTEXT)}
                      className="min-h-11 text-left px-4 py-3 bg-bg hover:bg-primary-soft border border-border rounded-md text-text-muted hover:text-text text-sm transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}

            {error && (
              <div className="flex items-start gap-2 bg-danger-soft border border-danger/30 rounded-md p-3 text-danger text-sm">
                <CircleAlert aria-hidden className="h-4 w-4 shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}

          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
              <textarea
                aria-label={t("Câu hỏi cho Trợ lý biển", "Question for the ocean assistant")}
                maxLength={2000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("Hỏi về du lịch sinh thái, văn hóa địa phương... (Enter để gửi)", "Ask about eco-tourism, local culture... (Enter to send)")}
                rows={1}
                className="flex-1 bg-surface border border-border-strong text-text rounded-sm px-4 py-3 focus:outline-none focus:border-primary resize-none text-sm"
                style={{ maxHeight: "120px" }}
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={stopGenerating}
                  aria-label={t("Dừng tạo câu trả lời", "Stop generating")}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center bg-danger hover:bg-danger/90 text-white rounded-md transition-colors"
                >
                  <Square aria-hidden className="h-4 w-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label={t("Gửi câu hỏi", "Send question")}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center bg-primary hover:bg-primary-hover disabled:bg-border disabled:text-text-muted text-white rounded-md transition-colors"
                >
                  <SendHorizontal aria-hidden className="h-5 w-5" />
                </button>
              )}
            </form>
          </div>
        </>
      )}
    </div>
  );
}
