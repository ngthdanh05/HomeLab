"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAIChat, ChatContext } from "@/hooks/useAIChat";
import { ChatBubble } from "./ChatBubble";
import { ItineraryCard } from "./ItineraryCard";
import { Itinerary } from "@/app/api/ai/itinerary/route";

const SUGGESTED_QUESTIONS = [
  "Gợi ý 5 hoạt động eco-friendly tại Hội An",
  "Carbon footprint khi đi từ HCM đến Sa Pa là bao nhiêu?",
  "Cách mua sắm có trách nhiệm tại chợ thủ công?",
  "Homestay bền vững ở Sapa là gì?",
];

export function TravelAssistant() {
  const { messages, isLoading, error, sendMessage, clearChat, stopGenerating } =
    useAIChat();
  const [input, setInput] = useState("");
  const [showItinerary, setShowItinerary] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [context] = useState<ChatContext>({
    carbonPreference: "low",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const msg = input;
    setInput("");
    await sendMessage(msg, context);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleGenerateItinerary = async () => {
    if (!destination) return;
    setItineraryLoading(true);
    try {
      const response = await fetch("/api/ai/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          days,
          interests: ["văn hóa", "thiên nhiên", "ẩm thực địa phương"],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate itinerary");
      }

      const data = await response.json();
      setItinerary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setItineraryLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
      {/* Header */}
      <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
        <div>
          <h2 className="text-white font-bold text-lg">
            🌿 AI Travel Assistant
          </h2>
          <p className="text-slate-400 text-sm">
            Hỗ trợ du lịch sinh thái bền vững tại Việt Nam
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowItinerary(!showItinerary)}
            className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            {showItinerary ? "💬 Chat" : "🗺️ Lịch trình"}
          </button>
          <button
            onClick={clearChat}
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
          >
            Xóa
          </button>
        </div>
      </div>

      {showItinerary ? (
        /* Itinerary Panel */
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Nhập điểm đến (VD: Hội An, Sa Pa...)"
              className="flex-1 bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
            />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              {[2, 3, 4, 5, 7].map((d) => (
                <option key={d} value={d}>
                  {d} ngày
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerateItinerary}
              disabled={!destination || itineraryLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium"
            >
              {itineraryLoading ? "Đang tạo..." : "Tạo lịch trình"}
            </button>
          </div>

          {itinerary && <ItineraryCard itinerary={itinerary} />}
        </div>
      ) : (
        /* Chat Panel */
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            {messages.length === 0 && (
              <div className="text-center space-y-6 py-8">
                <div className="text-4xl">🌿</div>
                <div>
                  <p className="text-slate-300 font-medium mb-1">
                    Xin chào! Tôi là AI Travel Assistant
                  </p>
                  <p className="text-slate-500 text-sm">
                    Hỏi tôi về du lịch sinh thái, văn hóa địa phương, và cách
                    giảm carbon footprint
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(q, context)}
                      className="text-left px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm transition-colors"
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
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-700">
            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi về du lịch sinh thái, văn hóa địa phương... (Enter để gửi)"
                rows={1}
                className="flex-1 bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 resize-none text-sm"
                style={{ maxHeight: "120px" }}
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={stopGenerating}
                  className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors"
                >
                  ⏹️
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors"
                >
                  ➤
                </button>
              )}
            </form>
          </div>
        </>
      )}
    </div>
  );
}
