import { geminiStructuredModel, SYSTEM_PROMPTS } from "@/lib/gemini";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export interface ItineraryDay {
  day: number;
  date?: string;
  activities: {
    time: string;
    activity: string;
    location: string;
    carbonKg: number;
    tip: string;
    type: "transport" | "accommodation" | "food" | "activity" | "culture";
  }[];
  totalCarbonKg: number;
  ecoScore: number;
}

export interface Itinerary {
  destination: string;
  days: number;
  totalCarbonKg: number;
  ecoScore: number;
  summary: string;
  itinerary: ItineraryDay[];
  packingTips: string[];
  carbonOffsetSuggestion: string;
}

export async function POST(request: NextRequest) {
  try {
    const { destination, days, interests } = await request.json();

    if (!destination || !days) {
      return new Response(
        JSON.stringify({ error: "destination and days are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = `${SYSTEM_PROMPTS.travelAssistant}

Tạo lịch trình du lịch sinh thái chi tiết cho:
- Điểm đến: ${destination}
- Số ngày: ${days} ngày
- Sở thích: ${interests?.join(", ") || "khám phá văn hóa và thiên nhiên"}

Trả về JSON với cấu trúc sau (chỉ JSON, không có text khác):
{
  "destination": "${destination}",
  "days": ${days},
  "totalCarbonKg": <tổng carbon ước tính>,
  "ecoScore": <điểm eco 0-100>,
  "summary": "<tóm tắt ngắn gọn về chuyến đi>",
  "itinerary": [
    {
      "day": 1,
      "activities": [
        {
          "time": "08:00",
          "activity": "<mô tả hoạt động>",
          "location": "<địa điểm cụ thể>",
          "carbonKg": <ước tính kg CO2>,
          "tip": "<mẹo bền vững>",
          "type": "transport|accommodation|food|activity|culture"
        }
      ],
      "totalCarbonKg": <tổng carbon ngày>,
      "ecoScore": <điểm eco ngày 0-100>
    }
  ],
  "packingTips": ["<tip đóng gói thân thiện môi trường>"],
  "carbonOffsetSuggestion": "<gợi ý bù đắp carbon>"
}`;

    const result = await geminiStructuredModel.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from AI");
    }

    const itinerary = JSON.parse(jsonMatch[0]) as Itinerary;

    return new Response(JSON.stringify(itinerary), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Itinerary generation error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("API key")) {
      return new Response(
        JSON.stringify({ error: "API key không hợp lệ." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Không thể tạo lịch trình. Vui lòng thử lại.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
