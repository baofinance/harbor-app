"use client";

import React, { useState, useRef, useEffect } from "react";

export type SimpleTooltipProps = {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
};

export default function SimpleTooltip({
  label,
  children,
  className = "",
  side = "bottom",
}: SimpleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      if (side === "right") {
        setPosition({
          top: rect.top + window.scrollY + rect.height / 2,
          left: rect.right + window.scrollX + 8,
        });
      } else if (side === "left") {
        setPosition({
          top: rect.top + window.scrollY + rect.height / 2,
          left: rect.left + window.scrollX - 8,
        });
      } else if (side === "top") {
        setPosition({
          top: rect.top + window.scrollY - 4,
          left: rect.left + window.scrollX + rect.width / 2,
        });
      } else {
        // bottom (default)
        setPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX + rect.width / 2,
        });
      }
    }
  }, [isVisible, side]);

  return (
    <>
      <span
        ref={triggerRef}
        className={`relative inline-flex items-center group ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </span>
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className="pointer-events-none fixed z-[9999] bg-gray-900 px-3 py-2 text-sm text-white shadow-xl rounded border border-gray-700 max-w-xs"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform:
              side === "right" || side === "left"
                ? "translate(0, -50%)"
                : side === "top"
                ? "translate(-50%, -100%)"
                : "translate(-50%, 0)",
          }}
        >
          <span className="text-white font-medium break-words">{label}</span>
          {side === "right" && (
            <span className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 h-2 w-2 rotate-45 bg-gray-900 border-l border-b border-gray-700" />
          )}
          {side === "left" && (
            <span className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 h-2 w-2 rotate-45 bg-gray-900 border-r border-t border-gray-700" />
          )}
          {side === "top" && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 h-2 w-2 rotate-45 bg-gray-900 border-r border-t border-gray-700" />
          )}
          {side === "bottom" && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 h-2 w-2 rotate-45 bg-gray-900 border-l border-b border-gray-700" />
          )}
        </div>
      )}
    </>
  );
}
