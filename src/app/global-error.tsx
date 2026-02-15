"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4f4f5",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Kritik Hata
          </h1>
          <p style={{ color: "#71717a", marginBottom: "1.5rem" }}>
            Uygulama beklenmeyen bir hata ile karşılaştı.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.5rem",
              backgroundColor: "#2C3E50",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Tekrar Dene
          </button>
        </div>
      </body>
    </html>
  );
}
