"use client";

import React from "react";

interface ModalShellProps {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  contentClassName?: string;
}

/**
 * Base modal wrapper: backdrop + panel. Used by Genesis, Anchor, Sail manage modals.
 */
export function ModalShell({
  children,
  onClose,
  className,
  contentClassName,
}: ModalShellProps) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 ${className ?? ""}`}>
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative bg-white shadow-2xl w-full max-w-md mx-2 sm:mx-4 animate-in fade-in-0 scale-in-95 duration-200 rounded-none max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col ${contentClassName ?? ""}`}
        style={{ borderRadius: 0 }}
      >
        {children}
      </div>
    </div>
  );
}
