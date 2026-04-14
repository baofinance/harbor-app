import { ImageResponse } from "next/og";

export const alt = "Maiden voyage 2.0 — Harbor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: 72,
          background: "linear-gradient(145deg, #0f2844 0%, #1e4775 42%, #17395f 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 20,
            marginBottom: 24,
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.03em",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
            }}
          >
            Maiden voyage
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#ff8a7a",
              letterSpacing: "-0.03em",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
            }}
          >
            2.0
          </span>
        </div>
        <p
          style={{
            fontSize: 34,
            color: "rgba(255,255,255,0.92)",
            maxWidth: 900,
            lineHeight: 1.35,
            fontWeight: 500,
          }}
        >
          Become a shareholder of new Harbor markets.
        </p>
        <p
          style={{
            marginTop: 36,
            fontSize: 22,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          harbor finance
        </p>
      </div>
    ),
    { ...size }
  );
}
