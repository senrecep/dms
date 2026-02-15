import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2C3E50, #1a252f)",
          borderRadius: 40,
        }}
      >
        {/* Document shape */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* White document */}
          <div
            style={{
              width: 72,
              height: 96,
              background: "rgba(255,255,255,0.95)",
              borderRadius: 6,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "16px 12px",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 44,
                height: 5,
                background: "rgba(44,62,80,0.15)",
                borderRadius: 3,
              }}
            />
            <div
              style={{
                width: 32,
                height: 5,
                background: "rgba(44,62,80,0.15)",
                borderRadius: 3,
              }}
            />
            <div
              style={{
                width: 44,
                height: 5,
                background: "rgba(44,62,80,0.15)",
                borderRadius: 3,
              }}
            />
            <div
              style={{
                width: 28,
                height: 5,
                background: "rgba(44,62,80,0.15)",
                borderRadius: 3,
              }}
            />
          </div>
          {/* Checkmark badge */}
          <div
            style={{
              position: "absolute",
              right: -20,
              bottom: -16,
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #5DADE2, #3498DB)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 12 L10 16 L18 8" />
            </svg>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
