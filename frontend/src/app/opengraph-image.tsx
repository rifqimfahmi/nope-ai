import { ImageResponse } from "next/og";

import { NopeMark } from "@/lib/brand";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #c62828 0%, #e5432c 50%, #f2843a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", marginBottom: 24 }}>
          <NopeMark size={112} fill="#ffffff" />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 128,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -2,
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 40,
            color: "rgba(255,255,255,0.9)",
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    { ...size },
  );
}
