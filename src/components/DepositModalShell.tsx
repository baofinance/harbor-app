"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface DepositModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional protocol row above tabs (Sail/Anchor/Genesis title + tokens) */
  banner?: React.ReactNode;
  /** Header content (title, tabs, etc.). Close button is auto-added on the right. */
  header: React.ReactNode;
  children: React.ReactNode;
  /** Disable close button (e.g. during tx processing) */
  closeDisabled?: boolean;
  /** Extra classes for the panel (e.g. max-h-[90vh], flex flex-col). Base includes rounded-xl + border. */
  panelClassName?: string;
  /** Extra classes for the content area */
  contentClassName?: string;
  /** Close button title/tooltip */
  closeTitle?: string;
  /** Extra classes for the header row (e.g. Genesis uses p-3 sm:p-4 lg:p-6, default is p-0 pt-2 px-2) */
  headerClassName?: string;
}

/**
 * Shared modal shell for Genesis, Sail, and Anchor deposit/manage modals.
 * Provides: overlay, backdrop, panel, optional protocol banner, header + close button, content area.
 *
 * All modal chrome (outer radius, banner slot, tab row spacing, white strip) should live here only—
 * individual modals pass `header`, `banner`, and optional `panelClassName` / `contentClassName` but
 * should not reimplement the frame.
 */
export function DepositModalShell({
  isOpen,
  onClose,
  banner,
  header,
  children,
  closeDisabled = false,
  panelClassName = "",
  contentClassName = "",
  closeTitle,
  headerClassName = "",
}: DepositModalShellProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        className={cn(
          "relative isolate bg-white shadow-2xl w-full max-w-md mx-2 sm:mx-4 animate-in fade-in-0 scale-in-95 duration-200 border-x border-b border-[#1E4775]/20",
          panelClassName,
          /* Ensure consumers cannot strip outer rounding (tw-merge: last wins for conflicting utilities) */
          "overflow-hidden rounded-xl",
        )}
      >
        {/* Protocol row — light bar (see ProtocolBanner); no dark fill so nothing bleeds into the tab strip */}
        {banner ? (
          <div className="relative z-10 shrink-0 overflow-hidden rounded-t-xl border-b border-[#1E4775]/15 bg-white">
            {banner}
          </div>
        ) : null}

        <div
          className={cn(
            "relative z-20 flex w-full items-center justify-between border-b border-[#1E4775]/20",
            banner && "bg-white",
            headerClassName ||
              (banner
                ? "pt-1.5 sm:pt-2 pb-0 pl-[5px] pr-2 sm:pr-3"
                : "p-0 pt-2 sm:pt-3 px-2 sm:px-3"),
          )}
        >
          <div className="flex-1 mr-2 sm:mr-4 min-w-0">{header}</div>
          <button
            onClick={onClose}
            className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors flex-shrink-0 touch-target flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7"
            aria-label="Close modal"
            title={closeTitle}
            disabled={closeDisabled}
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className={contentClassName || "p-3 sm:p-4 lg:p-6"}>{children}</div>
      </div>
    </div>
  );
}
