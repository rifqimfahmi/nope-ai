import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";

import { db } from "@/db";
import { challenges } from "@/db/schema";
import { SITE_NAME } from "@/lib/site";

export const alt = "A challenged claim, and the reply, on Nope AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CLAIM_LIMIT = 140;
const REPLY_LIMIT = 260;

function truncate(text: string, limit: number) {
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = Number(id);
  const [challenge] = Number.isInteger(parsedId)
    ? await db.select().from(challenges).where(eq(challenges.id, parsedId))
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#1e1e1e",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#f5f5f5" }}>
            {challenge ? `"${truncate(challenge.input, CLAIM_LIMIT)}"` : "A claim, challenged."}
          </div>
          <div style={{ display: "flex", fontSize: 28, lineHeight: 1.5, color: "#c9c9c9" }}>
            {challenge
              ? truncate(challenge.reply, REPLY_LIMIT)
              : "Tell it something you believe. It will disagree."}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#f2843a" }}>
          {SITE_NAME}
        </div>
      </div>
    ),
    { ...size },
  );
}
