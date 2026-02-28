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
      className={`p-3 bg-red-50 border border-red-500/30 text-red-600 text-sm text-center flex items-center justify-center gap-2 ${className}`.trim()}
    >
      <AlertOctagon className="w-4 h-4 flex-shrink-0" aria-hidden />
      {message}
    </div>
  );
}
