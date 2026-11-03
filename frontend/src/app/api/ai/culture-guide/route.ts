import { geminiStructuredModel, SYSTEM_PROMPTS } from "@/lib/gemini";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { destination, context } = await request.json();

    if (!destination) {
      return new Response(
        JSON.stringify({ error: "destination is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = `${SYSTEM_PROMPTS.cultureGuide}

Tạo hướng dẫn văn hóa chi tiết cho: ${destination}
${context ? `Context bổ sung: ${context}` : ""}

Trả về JSON với cấu trúc chính xác sau (chỉ JSON, không có text khác):
{
  "dos": ["điều nên làm 1", "điều nên làm 2", ...],
  "donts": ["điều không nên 1", "điều không nên 2", ...],
  "phrases": [
    {"phrase": "câu địa phương", "meaning": "nghĩa tiếng Anh", "pronunciation": "phát âm"}
  ],
  "customs": ["phong tục 1", "phong tục 2", ...],
  "localFood": ["món ăn 1", "món ăn 2", ...]
}`;

    const result = await geminiStructuredModel.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }

    const cultureGuide = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(cultureGuide), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Culture guide error:", error);
    return new Response(
      JSON.stringify({
        error: "Không thể tạo hướng dẫn văn hóa. Vui lòng thử lại.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
