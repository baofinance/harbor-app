"use client";

export function GenesisUpsideBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FF8A7A]/[0.04] to-[#0a1929]/20"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />
      <svg
        className="absolute -right-2 -top-2 h-20 w-20 opacity-[0.05] sm:right-2 sm:top-2"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle cx="40" cy="40" r="36" stroke="white" strokeWidth="1" />
        <circle cx="40" cy="40" r="24" stroke="white" strokeWidth="0.75" />
        <path
          d="M40 8 L42 22 L40 18 L38 22 Z"
          fill="white"
          opacity="0.8"
        />
        <path
          d="M40 72 L42 58 L40 62 L38 58 Z"
          fill="white"
          opacity="0.5"
        />
        <path
          d="M8 40 L22 42 L18 40 L22 38 Z"
          fill="white"
          opacity="0.5"
        />
        <path
          d="M72 40 L58 42 L62 40 L58 38 Z"
          fill="white"
          opacity="0.8"
        />
        <circle cx="40" cy="40" r="3" fill="white" opacity="0.6" />
      </svg>
    </div>
  );
}
