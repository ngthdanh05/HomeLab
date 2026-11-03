// Incremental parser for the `data: <payload>\n\n` server-sent events emitted
// by /api/ai/chat. Network chunks can split an event (or a multi-byte UTF-8
// character) anywhere, so text is buffered until a full event is available.

export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "error"; error: string }
  | { type: "done" };

export function createSSEParser() {
  let buffer = "";

  return function feed(chunk: string): ChatStreamEvent[] {
    buffer += chunk;
    const events: ChatStreamEvent[] = [];

    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const data = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue;

      if (data === "[DONE]") {
        events.push({ type: "done" });
        continue;
      }

      try {
        const parsed: unknown = JSON.parse(data);
        if (typeof parsed === "object" && parsed !== null) {
          const { text, error } = parsed as { text?: unknown; error?: unknown };
          if (typeof error === "string") events.push({ type: "error", error });
          else if (typeof text === "string") events.push({ type: "text", text });
        }
      } catch {
        // Ignore malformed events instead of aborting the whole stream.
      }
    }

    return events;
  };
}
