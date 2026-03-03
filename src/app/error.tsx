"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.error("[App error boundary]", error?.message ?? error);
    }
  }, [error]);

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 bg-[#1E4775] text-white font-sans">
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-white/80 text-sm mb-4 text-center max-w-md">
        A client-side error occurred. Try refreshing the page. If it keeps happening, clear cookies for this site and try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-[#FF8A7A] hover:bg-[#E07A6A] text-white font-medium transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
