import { ImageResponse } from "next/og";

// Default social preview for every page (1200×630).
// ASCII-only text: the built-in font has no Vietnamese diacritics.
// Edge runtime: next/og's Node build fails to load its bundled font on Windows ("Invalid URL").
export const runtime = "edge";
export const alt = "MyHomeLab — Regenerative Digital Eco-Tourism Platform";
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
          background: "linear-gradient(135deg, #022c22 0%, #0f172a 55%, #020617 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              background: "linear-gradient(135deg, #10b981, #0f766e)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
              fontWeight: 800,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>MyHomeLab</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.1, maxWidth: 1040 }}>
            Regenerative Digital Eco-Tourism
          </div>
          <div style={{ fontSize: 32, color: "#a7f3d0", maxWidth: 980, lineHeight: 1.35 }}>
            Buy direct from artisans · Offset your trip&apos;s carbon · Earn EcoToken &amp; NFT badges · Fund
            conservation through a community DAO
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 26, color: "#94a3b8" }}>
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
