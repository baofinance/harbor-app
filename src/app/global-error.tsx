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
    if (typeof window !== "undefined") {
      console.error("[Global error boundary]", error?.message ?? error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased font-sans bg-[#1E4775] text-white min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-2">Application error</h1>
        <p className="text-white/80 text-sm mb-4 text-center max-w-md">
          A client-side exception has occurred. Try refreshing the page or clearing site data (cookies) for app.harborfinance.io.
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-[#FF8A7A] hover:bg-[#E07A6A] text-white font-medium transition-colors"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
