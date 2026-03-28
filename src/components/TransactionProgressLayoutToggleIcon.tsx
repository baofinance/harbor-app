import React from "react";

/** Minimal axis icon: origin + horizontal arrow + vertical dotted axis (layout toggle). */
export function TransactionProgressLayoutToggleIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Origin */}
      <circle
        cx="5.5"
        cy="18.5"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="5.5" cy="18.5" r="1" fill="currentColor" />
      {/* Horizontal solid → */}
      <path
        d="M8.5 18.5H18.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M17 15.5L20 18.5L17 21.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Vertical dotted ↑ */}
      <path
        d="M5.5 15.5V6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeDasharray="2 4"
      />
      <path
        d="M3 7L5.5 4L8 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
