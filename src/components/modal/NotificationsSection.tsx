"use client";

import React from "react";
import { Bell, ChevronDown, ChevronUp } from "lucide-react";
import { InfoCallout } from "@/components/InfoCallout";

export interface NotificationItem {
  tone?: "info" | "success" | "warning" | "pearl";
  title?: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

interface NotificationsSectionProps {
  notifications: NotificationItem[];
  expanded: boolean;
  onToggle: () => void;
  badgeCount?: number;
  badgeColor?: "blue" | "green" | "orange" | "amber";
}

/**
 * Collapsible notifications block. Used in Genesis, Anchor, Sail modals.
 */
export function NotificationsSection({
  notifications,
  expanded,
  onToggle,
  badgeCount = 0,
  badgeColor = "blue",
}: NotificationsSectionProps) {
  const badgeClass =
    badgeColor === "orange"
      ? "bg-[#FF8A7A]/20 text-[#FF8A7A]"
      : badgeColor === "amber"
        ? "bg-amber-100 text-amber-600"
        : badgeColor === "green"
          ? "bg-green-100 text-green-600"
          : "bg-blue-100 text-blue-600";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-sm font-semibold text-[#1E4775] hover:text-[#17395F] transition-colors"
        aria-expanded={expanded}
      >
        <span>Notifications</span>
        <span className="flex items-center gap-2">
          {!expanded && badgeCount > 0 && (
            <span className={`flex items-center gap-1 ${badgeClass} px-2 py-0.5 text-xs`}>
              <Bell className="h-3 w-3" />
              {badgeCount}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[#1E4775]/70" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#1E4775]/70" />
          )}
        </span>
      </button>
      {expanded && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <InfoCallout
              key={i}
              tone={n.tone ?? "info"}
              title={n.title}
              icon={n.icon}
            >
              {n.content}
            </InfoCallout>
          ))}
        </div>
      )}
    </div>
  );
}
