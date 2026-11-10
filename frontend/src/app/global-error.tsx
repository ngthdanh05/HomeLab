"use client";

/** Replaces the root layout when the layout itself fails, so it must render <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="vi">
      <body style={{ background: "#020617", color: "#f1f5f9", fontFamily: "sans-serif", textAlign: "center", padding: "20vh 16px" }}>
        <h1>Đã xảy ra lỗi</h1>
        <p>Ứng dụng chưa tải được. Vui lòng thử lại sau ít phút.</p>
        <button type="button" onClick={reset} style={{ padding: "10px 20px", cursor: "pointer" }}>
          Thử lại
        </button>
      </body>
    </html>
  );
}
