import { ImageResponse } from "next/og";

// Default social preview for every page (1200×630).
// ASCII-only text: the built-in font has no Vietnamese diacritics.
// Edge runtime: next/og's Node build fails to load its bundled font on Windows ("Invalid URL").
export const runtime = "edge";
export const alt = "BlueReef Travel (San Hô Xanh) — Sustainable ocean travel that protects every reef";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#F7F9F9",
          color: "#132A33",
          borderBottom: "16px solid #0E6375",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 20,
              background: "#0E6375",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
              fontWeight: 800,
            }}
          >
            B
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>BlueReef Travel</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.1, maxWidth: 1040 }}>
            Explore the blue ocean, protect every coral reef
          </div>
          <div style={{ fontSize: 32, color: "#4D646D", maxWidth: 980, lineHeight: 1.35 }}>
            Reef-friendly dive plans · Buy direct from fishing villages · Offset your trip&apos;s carbon · Fund
            marine conservation through a community DAO
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 26, color: "#C2513A" }}>
          <span>70% artisan</span>
          <span>·</span>
          <span>20% community fund</span>
          <span>·</span>
          <span>10% platform</span>
        </div>
      </div>
    ),
    size,
  );
}
