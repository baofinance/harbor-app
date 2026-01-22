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
  followMouse?: boolean;
};

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
  
  const handleMouseMove = (event: MouseEvent) => {
    if (followMouse) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  };
  
  document.addEventListener("pointerdown", handlePointerDown);
  if (followMouse) {
    document.addEventListener("mousemove", handleMouseMove);
  }
  return () => {
    document.removeEventListener("pointerdown", handlePointerDown);
    if (followMouse) {
      document.removeEventListener("mousemove", handleMouseMove);
    }
  };
 }, [isVisible, followMouse]);

 useEffect(() => {
 if (!isVisible) return;

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
 
 if (followMouse) {
   // Always use mouse position when followMouse is enabled
   setPosition({
     top: mousePosition.y + 10,
     left: mousePosition.x + 10,
   });
   return;
 }
 
 if (!triggerRef.current) return;
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
 }, [isVisible, side, centerOnMobile, followMouse, mousePosition]);

 const handleMouseMove = (e: React.MouseEvent) => {
   if (followMouse) {
     setMousePosition({ x: e.clientX, y: e.clientY });
   }
 };

 const handleMouseEnter = (e: React.MouseEvent) => {
   if (followMouse) {
     // Capture mouse position immediately
     const pos = { x: e.clientX, y: e.clientY };
     setMousePosition(pos);
     // Set initial position right away
     setPosition({
       top: pos.y + 10,
       left: pos.x + 10,
     });
   }
   setIsVisible(true);
 };

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
 {isVisible && (
 <div
 ref={tooltipRef}
 role="tooltip"
  className="fixed z-[9999] bg-gray-900 px-3 py-2 text-sm text-white shadow-xl border border-gray-700 pointer-events-auto"
 style={{
 top: `${position.top}px`,
 left: `${position.left}px`,
   transform: followMouse
    ? "translate(0, 0)"
    : isMobileCentered
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
  onMouseMove={handleMouseMove}
  onClick={(event) => event.stopPropagation()}
 >
 <span className="text-white font-medium break-words">{label}</span>
 {!followMouse && !isMobileCentered && side ==="right" && (
 <span className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 h-2 w-2 rotate-45 bg-gray-900 border-l border-b border-gray-700" />
 )}
 {!followMouse && !isMobileCentered && side ==="left" && (
 <span className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 h-2 w-2 rotate-45 bg-gray-900 border-r border-t border-gray-700" />
 )}
 {!followMouse && !isMobileCentered && side ==="top" && (
 <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 h-2 w-2 rotate-45 bg-gray-900 border-r border-t border-gray-700" />
 )}
 {!followMouse && !isMobileCentered && side ==="bottom" && (
 <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 h-2 w-2 rotate-45 bg-gray-900 border-l border-b border-gray-700" />
 )}
 </div>
 )}
 </>
 );
}
