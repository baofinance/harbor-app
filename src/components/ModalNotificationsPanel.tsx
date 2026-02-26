"use client";

import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface ModalNotificationsPanelProps {
  /** Whether the notifications content is expanded */
  expanded: boolean;
  /** Toggle expand/collapse */
  onToggle: () => void;
  /** Badge shown when collapsed (e.g. Bell + count). Omit to hide badge. */
  badge?: React.ReactNode;
  /** Content shown when expanded (InfoCallout children) */
  children: React.ReactNode;
  /** Optional wrapper class (e.g. "mt-2 space-y-2" or "space-y-2 pt-3") */
  className?: string;
}

/**
 * Shared Bell + expand notifications block for Genesis, Sail, and Anchor modals.
 * Preserves exact DOM structure and styling.
 */
export function ModalNotificationsPanel({
  expanded,
  onToggle,
  badge,
  children,
  className = "space-y-2",
}: ModalNotificationsPanelProps) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-sm font-semibold text-[#1E4775]"
        aria-expanded={expanded}
      >
        <span>Notifications</span>
        <span className="flex items-center gap-2">
          {!expanded && badge}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[#1E4775]/70" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#1E4775]/70" />
          )}
        </span>
      </button>
      {expanded && <div className="space-y-2">{children}</div>}
    </div>
  );
}
