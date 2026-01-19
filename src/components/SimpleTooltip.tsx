"use client";

import React, { useState, useRef, useEffect } from "react";

export type SimpleTooltipProps = {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  maxHeight?: number | string;
  maxWidth?: number | string;
  centerOnMobile?: boolean;
};

export default function SimpleTooltip({
  label,
  children,
  className = "",
  side = "bottom",
  maxHeight,
  maxWidth,
  centerOnMobile = false,
}: SimpleTooltipProps) {
 const [isVisible, setIsVisible] = useState(false);
 const [position, setPosition] = useState({ top: 0, left: 0 });
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
  document.addEventListener("pointerdown", handlePointerDown);
  return () => {
    document.removeEventListener("pointerdown", handlePointerDown);
  };
 }, [isVisible]);

 useEffect(() => {
 if (!isVisible || !triggerRef.current) return;

 if (
  centerOnMobile &&
  typeof window !== "undefined" &&
  window.innerWidth < 1024
 ) {
  setPosition({
    top: window.scrollY + window.innerHeight / 2,
    left: window.innerWidth / 2,
  });
  setIsMobileCentered(true);
  return;
 }

 setIsMobileCentered(false);
 const rect = triggerRef.current.getBoundingClientRect();
  if (side ==="right") {
 setPosition({
     top: rect.top + rect.height / 2,
     left: rect.right + 8,
 });
 } else if (side ==="left") {
 setPosition({
     top: rect.top + rect.height / 2,
      left: rect.left - 8,
 });
 } else if (side ==="top") {
 setPosition({
     top: rect.top - 4,
     left: rect.left + rect.width / 2,
 });
 } else {
 // bottom (default)
 setPosition({
     top: rect.bottom + 4,
     left: rect.right - 8,
 });
 }
 }, [isVisible, side, centerOnMobile]);

 return (
 <>
 <span
 ref={triggerRef}
 className={`relative inline-flex items-center group ${className}`}
 onMouseEnter={() => setIsVisible(true)}
 onMouseLeave={() => setIsVisible(false)}
 onClick={(event) => {
  event.stopPropagation();
  setIsVisible((prev) => !prev);
 }}
 >
 {children}
 </span>
 {isVisible && (
 <div
 ref={tooltipRef}
 role="tooltip"
  className="fixed z-[9999] bg-gray-900 px-3 py-2 text-sm text-white shadow-xl border border-gray-700 pointer-events-auto"
 style={{
 top: `${position.top}px`,
 left: `${position.left}px`,
   transform: isMobileCentered
    ? "translate(-50%, -50%)"
    : side ==="right"
     ?"translate(0, -50%)"
     : side ==="left"
     ?"translate(-100%, -50%)"
 : side ==="top"
 ?"translate(-50%, -100%)"
 :"translate(-50%, 0)",
   maxHeight: maxHeight ?? "70vh",
   maxWidth: maxWidth ?? "20rem",
 }}
  onMouseEnter={() => setIsVisible(true)}
  onMouseLeave={() => setIsVisible(false)}
  onClick={(event) => event.stopPropagation()}
 >
 <span className="text-white font-medium break-words">{label}</span>
 {!isMobileCentered && side ==="right" && (
 <span className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 h-2 w-2 rotate-45 bg-gray-900 border-l border-b border-gray-700" />
 )}
 {!isMobileCentered && side ==="left" && (
 <span className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 h-2 w-2 rotate-45 bg-gray-900 border-r border-t border-gray-700" />
 )}
 {!isMobileCentered && side ==="top" && (
 <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 h-2 w-2 rotate-45 bg-gray-900 border-r border-t border-gray-700" />
 )}
 {!isMobileCentered && side ==="bottom" && (
 <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 h-2 w-2 rotate-45 bg-gray-900 border-l border-b border-gray-700" />
 )}
 </div>
 )}
 </>
 );
}
