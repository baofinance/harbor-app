"use client";

import { AlertOctagon } from "lucide-react";

export function ErrorBanner({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-md border border-red-500/30 bg-red-50 p-2.5 text-left text-xs text-red-700 ${className}`.trim()}
    >
      <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

/** Keeps a small slot when an error appears so the footer does not jump. */
export function ReservedErrorSlot({
  message,
  className = "",
}: {
  message?: string | null;
  className?: string;
}) {
  if (!message) {
    return className ? <div className={className} aria-hidden /> : null;
  }
  return (
    <div className={className.trim()} aria-live="polite">
      <ErrorBanner message={message} />
    </div>
  );
}
