"use client";

import React from "react";
import { AlertOctagon } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  className?: string;
}

/**
 * Error/rejection banner. Matches Genesis, Sail, Anchor styling.
 */
export function ErrorBanner({ message, className }: ErrorBannerProps) {
  return (
    <div
      className={`p-3 bg-red-50 border border-red-500/30 text-red-600 text-sm text-center flex items-center justify-center gap-2 ${className ?? ""}`}
    >
      <AlertOctagon className="w-4 h-4 flex-shrink-0" aria-hidden />
      {message}
    </div>
  );
}
