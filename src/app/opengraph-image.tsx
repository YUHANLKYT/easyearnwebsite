import { ImageResponse } from "next/og";

import { APP_NAME } from "@/lib/constants";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "64px",
          background:
            "radial-gradient(circle at 18% 16%, rgba(251,146,60,0.24), transparent 36%), radial-gradient(circle at 82% 84%, rgba(14,165,233,0.25), transparent 42%), #f8fafc",
          color: "#0f172a",
          fontFamily: "Inter, Segoe UI, Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #f59e0b 0%, #f97316 45%, #2563eb 100%)",
            color: "#ffffff",
            fontSize: 104,
            fontWeight: 800,
            lineHeight: 1,
            boxShadow: "0 24px 60px rgba(15,23,42,0.22)",
          }}
        >
          ee
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 780 }}>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -1 }}>{APP_NAME}</div>
          <div style={{ fontSize: 36, color: "#334155" }}>Trusted rewards platform with real offerwall payouts.</div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
