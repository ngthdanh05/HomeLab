import { geminiModel, SYSTEM_PROMPTS } from "@/lib/gemini";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    const contextInfo = context
      ? `\nContext: Điểm đến: ${context.destination || "chưa xác định"}, Sở thích: ${context.interests?.join(", ") || "không"}, Ưu tiên carbon: ${context.carbonPreference || "trung bình"}`
      : "";

    const fullPrompt = `${SYSTEM_PROMPTS.travelAssistant}${contextInfo}\n\nKhách hỏi: ${message}`;

    // Khởi tạo stream
    const result = await geminiModel.generateContentStream(fullPrompt);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              const data = `data: ${JSON.stringify({ text })}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
          }
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (
      errorMessage.includes("API key") ||
      errorMessage.includes("INVALID_ARGUMENT")
    ) {
      return new Response(
        JSON.stringify({
          error:
            "API key không hợp lệ. Vui lòng kiểm tra cấu hình GEMINI_API_KEY.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Lỗi khi xử lý yêu cầu. Vui lòng thử lại." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
