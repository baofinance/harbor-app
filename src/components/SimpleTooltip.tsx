"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";

const VIEW_PADDING = 8;
const TRIGGER_GAP = 8;

export type SimpleTooltipProps = {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  maxHeight?: number | string;
  maxWidth?: number | string;
  centerOnMobile?: boolean;
  followMouse?: boolean;
};

function computeAnchoredCoords(
  side: SimpleTooltipProps["side"],
  rect: DOMRect
): { top: number; left: number } {
  switch (side) {
    case "right":
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + TRIGGER_GAP,
      };
    case "left":
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - TRIGGER_GAP,
      };
    case "top":
      return {
        top: rect.top - TRIGGER_GAP,
        left: rect.left + rect.width / 2,
      };
    default:
      return {
        top: rect.bottom + TRIGGER_GAP,
        left: rect.left + rect.width / 2,
      };
  }
}

export default function SimpleTooltip({
  label,
  children,
  className = "",
  side = "bottom",
  maxHeight,
  maxWidth,
  centerOnMobile = false,
  followMouse = false,
}: SimpleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [clamp, setClamp] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMobileCentered, setIsMobileCentered] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return;
      }
      setIsVisible(false);
    };

    const handleMouseMoveGlobal = (event: MouseEvent) => {
      if (followMouse) {
        setMousePosition({ x: event.clientX, y: event.clientY });
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    if (followMouse) {
      document.addEventListener("mousemove", handleMouseMoveGlobal);
    }
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      if (followMouse) {
        document.removeEventListener("mousemove", handleMouseMoveGlobal);
      }
    };
  }, [isVisible, followMouse]);

  /** Anchored to trigger + viewport clamp (not used when `followMouse`). */
  useLayoutEffect(() => {
    if (!isVisible) {
      setClamp({ x: 0, y: 0 });
      return;
    }

    setClamp({ x: 0, y: 0 });

    if (
      centerOnMobile &&
      typeof window !== "undefined" &&
      window.innerWidth < 1024
    ) {
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      setIsMobileCentered(true);
      return;
    }

    setIsMobileCentered(false);

    if (followMouse) return;

    const trig = triggerRef.current;
    if (trig) {
      setPosition(
        computeAnchoredCoords(side, trig.getBoundingClientRect())
      );
    }

    requestAnimationFrame(() => {
      const tip = tooltipRef.current;
      if (!tip || followMouse) return;
      const tb = tip.getBoundingClientRect();
      let ox = 0;
      let oy = 0;
      if (tb.right > window.innerWidth - VIEW_PADDING) {
        ox -= tb.right - (window.innerWidth - VIEW_PADDING);
      }
      if (tb.left + ox < VIEW_PADDING) {
        ox += VIEW_PADDING - (tb.left + ox);
      }
      if (tb.bottom > window.innerHeight - VIEW_PADDING) {
        oy -= tb.bottom - (window.innerHeight - VIEW_PADDING);
      }
      if (tb.top + oy < VIEW_PADDING) {
        oy += VIEW_PADDING - (tb.top + oy);
      }
      if (ox !== 0 || oy !== 0) {
        setClamp({ x: ox, y: oy });
      }
    });
  }, [
    isVisible,
    side,
    centerOnMobile,
    followMouse,
    label,
    maxHeight,
    maxWidth,
  ]);

  /** Cursor-following overlays: update each move without coupling anchored tooltips. */
  useLayoutEffect(() => {
    if (!isVisible || !followMouse) return;
    setClamp({ x: 0, y: 0 });
    setIsMobileCentered(false);
    setPosition({
      top: mousePosition.y + TRIGGER_GAP,
      left: mousePosition.x + TRIGGER_GAP,
    });
  }, [isVisible, followMouse, mousePosition.x, mousePosition.y]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (followMouse) {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (followMouse) {
      const pos = { x: e.clientX, y: e.clientY };
      setMousePosition(pos);
      setPosition({
        top: pos.y + TRIGGER_GAP,
        left: pos.x + TRIGGER_GAP,
      });
    }
    setIsVisible(true);
  };

  const transform = followMouse
    ? "translate(0, 0)"
    : isMobileCentered
      ? "translate(-50%, -50%)"
      : side === "right"
        ? "translate(0, -50%)"
        : side === "left"
          ? "translate(-100%, -50%)"
          : side === "top"
            ? "translate(-50%, -100%)"
            : "translate(-50%, 0)";

  const tooltipEl =
    isVisible && typeof document !== "undefined" ? (
      <div
        ref={tooltipRef}
        role="tooltip"
        className="fixed z-[9999] bg-gray-900 px-3 py-2 text-sm text-white shadow-xl border border-gray-700 pointer-events-auto font-medium break-words"
        style={{
          top: `${position.top + clamp.y}px`,
          left: `${position.left + clamp.x}px`,
          transform,
          maxHeight: maxHeight ?? "70vh",
          maxWidth: maxWidth ?? "20rem",
        }}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onMouseMove={handleMouseMove}
        onClick={(event) => event.stopPropagation()}
      >
        {label}
        {!followMouse && !isMobileCentered && side === "right" && (
          <span className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 h-2 w-2 rotate-45 bg-gray-900 border-l border-b border-gray-700" />
        )}
        {!followMouse && !isMobileCentered && side === "left" && (
          <span className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 h-2 w-2 rotate-45 bg-gray-900 border-r border-t border-gray-700" />
        )}
        {!followMouse && !isMobileCentered && side === "top" && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 h-2 w-2 rotate-45 bg-gray-900 border-r border-t border-gray-700" />
        )}
        {!followMouse && !isMobileCentered && side === "bottom" && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 h-2 w-2 rotate-45 bg-gray-900 border-l border-b border-gray-700" />
        )}
      </div>
    ) : null;

  return (
    <>
      <span
        ref={triggerRef}
        className={`relative inline-flex items-center group ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
        onMouseMove={handleMouseMove}
        onClick={(event) => {
          event.stopPropagation();
          setIsVisible((prev) => !prev);
        }}
      >
        {children}
      </span>
      {tooltipEl ? createPortal(tooltipEl, document.body) : null}
    </>
  );
}
