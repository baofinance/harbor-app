"use client";

import React, { useState, useRef, useEffect } from "react";

export type SimpleTooltipProps = {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function SimpleTooltip({
  label,
  children,
  className = "",
}: SimpleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }
  }, [isVisible]);

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
          className="pointer-events-none fixed z-[9999] bg-[#1E4775] px-3 py-2 text-sm text-white shadow-lg whitespace-nowrap rounded"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: "translate(-50%, 0)",
          }}
        >
          <span className="text-white font-medium">{label}</span>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0 h-2 w-2 rotate-45 bg-[#1E4775]" />
        </div>
      )}
    </>
  );
}

