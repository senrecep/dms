"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Hata</h1>
          <p className="text-lg text-muted-foreground">
            Beklenmeyen bir hata oluştu.
          </p>
          <p className="text-sm text-muted-foreground/70">
            An unexpected error occurred.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Tekrar Dene
          </button>
          <a
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Ana Sayfa
          </a>
        </div>
      </div>
    </div>
  );
}
