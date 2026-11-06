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

/** The picture shown when the link is shared on LinkedIn and other sites. */
export default function OpenGraphImage() {
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
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundImage: "linear-gradient(135deg, #7c3aed, #4f46e5)",
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div style={{ fontSize: 44, fontWeight: 700 }}>TestVault</div>
      </div>
      <div style={{ marginTop: 44, fontSize: 76, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2 }}>Every test. One command center.</div>
      <div style={{ marginTop: 24, fontSize: 32, color: "#a2a5c6" }}>Cases, runs, bugs and reports. Try the live demo.</div>
      <div style={{ marginTop: 52, display: "flex", width: "100%", height: 20, borderRadius: 10, overflow: "hidden" }}>
        {STATUSES.map((status) => (
          <div key={status.label} style={{ flexGrow: status.grow, backgroundColor: status.color }} />
        ))}
      </div>
    </div>,
    size,
  );
}
