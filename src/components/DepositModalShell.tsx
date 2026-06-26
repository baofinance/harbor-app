"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  HARBOR_FROSTED_MODAL_SHELL,
  HARBOR_FROSTED_PANEL_FILL,
} from "@/components/shared/harborFrostedSurfaceStyles";
import { DepositModalExpandedNotifications } from "@/components/DepositModalExpandedNotifications";
import { DepositModalNotificationBell } from "@/components/DepositModalNotificationBell";
import {
  type DepositModalNotificationSeverity,
  pickHeaviestDepositModalNotificationBadge,
} from "@/components/depositModalNotificationStyles";

export interface DepositModalShellNotifications {
  expanded: boolean;
  onToggle: () => void;
  /** Numeric badge on the bell when collapsed */
  count?: number;
  /** One severity per visible notification; bell uses the heaviest. */
  badgeSeverities?: DepositModalNotificationSeverity[];
  children: React.ReactNode;
}

export interface DepositModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  /** Title row (string or DepositModalTitle with icons) */
  title: React.ReactNode;
  /** Full-width tab row (DepositModalTabHeader) */
  tabs: React.ReactNode;
  /** Optional notifications drawer between title and tabs */
  notifications?: DepositModalShellNotifications;
  children: React.ReactNode;
  closeDisabled?: boolean;
  closeTitle?: string;
  panelClassName?: string;
  contentClassName?: string;
  /** @deprecated Use `title` + `tabs`. Kept for gradual migration. */
  banner?: React.ReactNode;
  /** @deprecated Use `tabs`. */
  header?: React.ReactNode;
  headerClassName?: string;
  /** Inline panel (no overlay) for embedded manage UI on index pages. */
  variant?: "modal" | "inline";
}

/**
 * Shared modal shell for Genesis, Sail, and Anchor deposit/manage modals.
 */
export function DepositModalShell({
  isOpen,
  onClose,
  title,
  tabs,
  notifications,
  children,
  closeDisabled = false,
  closeTitle,
  panelClassName = "",
  contentClassName = "",
  banner,
  header,
  headerClassName = "",
  variant = "modal",
}: DepositModalShellProps) {
  if (!isOpen) return null;

  const legacyLayout = banner != null || header != null;

  if (variant === "inline") {
    return (
      <div className={cn("flex min-h-0 flex-col", panelClassName)}>
        <div className="mb-3 shrink-0">{tabs}</div>
        <div className={cn("min-h-0 flex-1 overflow-y-auto", contentClassName)}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:items-center sm:px-4 sm:py-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        className={cn(
          "relative isolate flex w-full max-w-md flex-col animate-in fade-in-0 scale-in-95 duration-200 md:max-w-lg",
          HARBOR_FROSTED_MODAL_SHELL,
          "max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-hidden rounded-xl",
          panelClassName
        )}
      >
        {legacyLayout ? (
          <>
            {banner ? (
              <div className={cn("relative z-10 shrink-0 overflow-hidden rounded-t-xl border-b border-[#1E4775]/15", HARBOR_FROSTED_PANEL_FILL)}>
                {banner}
              </div>
            ) : null}
            <div
              className={cn(
                "relative z-20 flex w-full items-center justify-between border-b border-[#1E4775]/20",
                banner && HARBOR_FROSTED_PANEL_FILL,
                headerClassName ||
                  (banner
                    ? "pt-1.5 sm:pt-2 pb-0 pl-[5px] pr-2 sm:pr-3"
                    : "p-0 pt-2 sm:pt-3 px-2 sm:px-3")
              )}
            >
              <div className="min-w-0 flex-1 mr-2 sm:mr-4">{header}</div>
              <ModalCloseButton
                onClose={onClose}
                disabled={closeDisabled}
                title={closeTitle}
              />
            </div>
          </>
        ) : (
          <>
            <div className={cn("relative z-20 flex shrink-0 items-center justify-between gap-2 border-b border-[#1E4775]/15 px-3 py-2.5 sm:px-4", HARBOR_FROSTED_PANEL_FILL)}>
              <h2 className="flex min-w-0 flex-1 items-center truncate text-sm font-bold leading-snug tracking-tight text-[#1E4775] sm:text-base">
                {title}
              </h2>
              <div className="flex shrink-0 items-center gap-1">
                {notifications ? (
                  <DepositModalNotificationBell
                    count={notifications.count}
                    active={notifications.expanded}
                    onClick={notifications.onToggle}
                    badgeSeverity={pickHeaviestDepositModalNotificationBadge(
                      notifications.badgeSeverities ?? ["navy"]
                    )}
                  />
                ) : null}
                <ModalCloseButton
                  onClose={onClose}
                  disabled={closeDisabled}
                  title={closeTitle}
                />
              </div>
            </div>

            {notifications?.expanded ? (
              <DepositModalExpandedNotifications onCollapse={notifications.onToggle}>
                {notifications.children}
              </DepositModalExpandedNotifications>
            ) : null}

            <div className={cn("relative z-20 shrink-0 border-b border-[#1E4775]/20 px-2 pb-2 pt-1.5 sm:px-3", HARBOR_FROSTED_PANEL_FILL)}>
              {tabs}
            </div>
          </>
        )}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            contentClassName || "p-3 sm:p-4 lg:p-6"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalCloseButton({
  onClose,
  disabled,
  title,
}: {
  onClose: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#1E4775]/50 transition hover:bg-[#1E4775]/8 hover:text-[#1E4775] touch-target"
      aria-label="Close modal"
      title={title}
      disabled={disabled}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}
