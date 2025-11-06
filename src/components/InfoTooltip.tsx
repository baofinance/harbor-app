import React from "react";

export type InfoTooltipProps = {
  label: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
};

export default function InfoTooltip({
  label,
  className,
  side = "top",
}: InfoTooltipProps) {
  const positionClasses = (() => {
    switch (side) {
      case "bottom":
        return {
          container: "top-full mt-2 left-1/2 -translate-x-1/2",
          arrow: "-top-1 left-1/2 -translate-x-1/2",
        };
      case "left":
        return {
          container: "left-0 -translate-x-full -ml-2 top-1/2 -translate-y-1/2",
          arrow: "left-full top-1/2 -translate-y-1/2 -ml-1",
        };
      case "right":
        return {
          container: "left-full ml-2 top-1/2 -translate-y-1/2",
          arrow: "-left-1 top-1/2 -translate-y-1/2",
        };
      case "top":
      default:
        return {
          container: "bottom-full mb-2 left-1/2 -translate-x-1/2",
          arrow: "-bottom-1 left-1/2 -translate-x-1/2",
        };
    }
  })();

  return (
    <span
      className={"relative inline-flex items-center group " + (className ?? "")}
    >
      <span
        tabIndex={0}
        className="inline-flex h-5 w-5 items-center justify-center  text-white/60 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        aria-label="Info"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-3.5 w-3.5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </span>
      <div
        role="tooltip"
        className={
          "pointer-events-none absolute z-20 whitespace-nowrap  bg-black/80 px-2 py-1 text-[11px] text-white  shadow-lg opacity-0 transition-opacity duration-150 " +
          positionClasses.container +
          " group-hover:opacity-100 group-focus-within:opacity-100"
        }
      >
        {label}
        <span
          className={
            "absolute h-2 w-2 rotate-45 bg-black/80  " +
            positionClasses.arrow
          }
        />
      </div>
    </span>
  );
}
