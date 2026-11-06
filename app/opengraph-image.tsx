import { ImageResponse } from "next/og";

export const alt = "TestVault: test management, beautifully fast";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STATUSES = [
  { label: "Passed", color: "#34d399", grow: 62 },
  { label: "Failed", color: "#fb7185", grow: 14 },
  { label: "Blocked", color: "#fbbf24", grow: 6 },
  { label: "Untested", color: "#475569", grow: 18 },
];

const HEADLINE = "Every test. One command center.";
const TAGLINE = "Cases, runs, bugs and reports. Try the live demo.";

/** Fetches only the letters a piece of text needs. */
async function loadFont(family: string, weight: 400 | 700 | 800, text: string) {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error(`No font file for ${family}`);
  return { name: family, data: await (await fetch(url)).arrayBuffer(), weight, style: "normal" as const };
}

/** All or nothing: a font that covers only some of the text would mix letter styles. */
async function loadFonts() {
  try {
    return await Promise.all([loadFont("Oxanium", 700, "TestVault"), loadFont("Inter", 800, HEADLINE), loadFont("Inter", 400, TAGLINE)]);
  } catch {
    return null;
  }
}

/** The picture shown when the link is shared on LinkedIn and other sites. */
export default async function OpenGraphImage() {
  const fonts = await loadFonts();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        color: "#eeeffc",
        backgroundColor: "#0a0b1e",
        backgroundImage: "radial-gradient(circle at 15% 10%, rgba(124,58,237,0.55), transparent 50%), radial-gradient(circle at 90% 85%, rgba(79,70,229,0.5), transparent 50%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width="84" height="84" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="mark" gradientUnits="userSpaceOnUse" x1="4" y1="4" x2="60" y2="60">
              <stop stopColor="#22d3ee" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#mark)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 14v8l24 34 24-34v-8" />
            <path d="M21 14v5l11 17 11-17v-5" />
          </g>
          <circle cx="8" cy="10" r="4.5" fill="#22d3ee" />
          <circle cx="56" cy="10" r="4.5" fill="#22d3ee" />
          <circle cx="21" cy="10" r="4" fill="#8b5cf6" />
          <circle cx="43" cy="10" r="4" fill="#8b5cf6" />
        </svg>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 700, fontFamily: fonts ? "Oxanium" : undefined }}>
          Test
          <span style={{ backgroundImage: "linear-gradient(90deg, #22d3ee, #a78bfa)", backgroundClip: "text", color: "transparent" }}>Vault</span>
        </div>
      </div>
      <div style={{ marginTop: 44, fontSize: 76, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, fontFamily: fonts ? "Inter" : undefined }}>{HEADLINE}</div>
      <div style={{ marginTop: 24, fontSize: 32, fontWeight: 400, color: "#a2a5c6", fontFamily: fonts ? "Inter" : undefined }}>{TAGLINE}</div>
      <div style={{ marginTop: 52, display: "flex", width: "100%", height: 20, borderRadius: 10, overflow: "hidden" }}>
        {STATUSES.map((status) => (
          <div key={status.label} style={{ flexGrow: status.grow, backgroundColor: status.color }} />
        ))}
      </div>
    </div>,
    { ...size, fonts: fonts ?? undefined },
  );
}
