 "use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type InfoTooltipProps = {
  label: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
};

export default function InfoTooltip({
  label,
  children,
  className,
  side = "top",
}: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    if (side === "right") {
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    } else if (side === "left") {
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.left - 12,
      });
    } else if (side === "bottom") {
      setPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      });
    } else {
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [side]);

  useEffect(() => {
    if (!isVisible) return;
    updatePosition();
  }, [isVisible, updatePosition]);

  useEffect(() => {
    if (!isVisible) return;
    const handleUpdate = () => updatePosition();
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);
    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isVisible, updatePosition]);

  const tooltip = isVisible && (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[2147483647] bg-gray-900 px-6 py-4 text-base text-white shadow-xl min-w-[400px] max-w-2xl border border-gray-700"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform:
          side === "right" || side === "left"
            ? "translate(0, -50%)"
            : side === "bottom"
            ? "translate(-50%, 0)"
            : "translate(-50%, -100%)",
      }}
    >
      <div className="break-words whitespace-normal leading-relaxed">
        {label}
      </div>
      {side === "right" && (
        <span className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 h-3 w-3 rotate-45 bg-gray-900 border-l border-b border-gray-700" />
      )}
      {side === "left" && (
        <span className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 h-3 w-3 rotate-45 bg-gray-900 border-r border-t border-gray-700" />
      )}
      {side === "bottom" && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 h-3 w-3 rotate-45 bg-gray-900 border-l border-b border-gray-700" />
      )}
      {side === "top" && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 h-3 w-3 rotate-45 bg-gray-900 border-r border-t border-gray-700" />
      )}
    </div>
  );

  return (
    <>
      <span
        ref={triggerRef}
        className={"relative inline-flex items-center" + (className ?? "")}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children ? (
          <span tabIndex={0} aria-label="Info">
            {children}
          </span>
        ) : (
          <span
            tabIndex={0}
            className="inline-flex h-5 w-5 items-center justify-center text-white/60 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
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
        )}
      </span>
      {isMounted && tooltip
        ? createPortal(tooltip, document.body)
        : null}
    </>
  );
}
